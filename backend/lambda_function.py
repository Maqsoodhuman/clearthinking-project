import json
import boto3
import logging
import os
import re
from decimal import Decimal
from botocore.exceptions import ClientError
from prompts import get_system_prompt
from constants import TABLE_NAME, MODEL_ID

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime', region_name="us-east-1")

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert DynamoDB Decimal types to standard JSON numbers."""
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super(DecimalEncoder, self).default(o)

def create_response(status_code, body):
    """Helper to ensure consistent response structure."""
    return {
        'statusCode': int(status_code),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    """
    AWS Lambda Handler for ClearThinker AI Decision Coach.
    """
    try:
        logger.info("Received event: %s", json.dumps(event, default=str))

        request_context = event.get('requestContext', {})
        http_data = request_context.get('http', {})
        method = http_data.get('method')

        if method == 'OPTIONS':
            return create_response(200, {})

        # 1. Parse Input
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        action = body.get('action', 'chat') # Default to chat if missing

        if not user_id:
            return create_response(400, {'error': 'Missing userId'})

        table = dynamodb.Table(TABLE_NAME)

        # --- HANDLE ACTION: INITIALIZE (Onboarding) ---
        if action == 'initialize':
            data = body.get('data', {})
            role = data.get('role', 'User')
            industry = data.get('industry', 'General')
            
            try:
                # Save static profile data
                # FIX: 'Role' is a reserved keyword in DynamoDB.
                table.update_item(
                    Key={'UserId': user_id},
                    UpdateExpression="set #r = :r, Industry = :i, Traits = list_append(if_not_exists(Traits, :empty), :empty), History = list_append(if_not_exists(History, :empty), :empty)",
                    ExpressionAttributeNames={
                        '#r': 'Role'
                    },
                    ExpressionAttributeValues={
                        ':r': role,
                        ':i': industry,
                        ':empty': []
                    }
                )
                return create_response(200, {'success': True})
            except ClientError as e:
                logger.error("DynamoDB Init Error: %s", e)
                return create_response(500, {'error': 'Failed to save profile'})

        # --- HANDLE ACTION: CHAT ---
        message = body.get('message')
        if not message:
            return create_response(400, {'error': 'Message required for chat action'})

        # 2. Fetch User Profile & History
        try:
            response = table.get_item(Key={'UserId': user_id})
            item = response.get('Item', {})
        except ClientError as e:
            logger.error("DynamoDB Fetch Error: %s", e)
            item = {}

        role = item.get('Role', 'User')
        industry = item.get('Industry', 'General')
        # Ensure traits/history are not None (DecimalEncoder handles numbers inside)
        traits = item.get('Traits', [])
        history = item.get('History', [])
        
        trait_strings = [str(t) for t in traits]
        system_prompt = get_system_prompt(role, industry, trait_strings)

        gpt_messages = [
            {"role": "system", "content": system_prompt}
        ] + history + [
            {"role": "user", "content": message}
        ]

        # Payload structure for OpenAI-compatible Chat API
        payload = {
            "messages": gpt_messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        print(f'Payload is {payload}')

        try:
            response = bedrock.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps(payload, cls=DecimalEncoder),
                contentType='application/json',
                accept='application/json'
            )
        
            response_body = json.loads(response.get('body').read())
            if 'choices' in response_body:
                ai_content_text = response_body['choices'][0]['message']['content']
            elif 'content' in response_body:
                ai_content_text = response_body['content'][0]['text']
            elif 'error' in response_body:
                 raise Exception(f"API returned Error: {response_body['error']}")
            else:
                 raise Exception(f"Unknown Response Structure. Keys: {list(response_body.keys())}")

            ai_content_text = re.sub(r'<reasoning>.*?</reasoning>', '', ai_content_text, flags=re.DOTALL)
            ai_content_text = re.sub(r'<think>.*?</think>', '', ai_content_text, flags=re.DOTALL)
            
            start_idx = ai_content_text.find('{')
            end_idx = ai_content_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                ai_content_text = ai_content_text[start_idx : end_idx + 1]
            
            logger.info("Cleaned Content Text for JSON Parse: %s", ai_content_text)
            ai_data = json.loads(ai_content_text)
            
        except Exception as e:
            logger.error("Bedrock/Invoke Error: %s", e)
            ai_data = {
                "reply": "I'm having trouble thinking right now. Please try again.",
                "status": "yellow",
                "new_traits": []
            }
            ai_content_text = json.dumps(ai_data)

        # 5. Update DynamoDB (History + Traits)
        new_traits = ai_data.get('new_traits', [])
        
        # Prepare new history items (User message + AI raw response)
        new_history_items = [
            {"role": "user", "content": message},
            {"role": "assistant", "content": ai_content_text}
        ]

        update_expression = "SET History = list_append(if_not_exists(History, :empty), :new_history)"
        expression_attribute_values = {
            ':empty': [],
            ':new_history': new_history_items
        }

        if new_traits:
            current_trait_set = set([str(t) for t in traits])
            new_trait_set = set([str(t) for t in new_traits])
            updated_traits = list(current_trait_set.union(new_trait_set))
            
            update_expression += ", Traits = :t"
            expression_attribute_values[':t'] = updated_traits

        try:
            table.update_item(
                Key={'UserId': user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_attribute_values
            )
        except ClientError as e:
            logger.error("DynamoDB Update Error: %s", e)

        # 6. Return Response
        return create_response(200, ai_data)

    except Exception as e:
        logger.error("Unexpected Error: %s", e)
        return create_response(500, {'error': str(e)})