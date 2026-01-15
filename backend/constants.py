import os

# AWS DynamoDB Configuration
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'ClearThinkerProfiles')

# AI Model Configuration
MODEL_ID = "openai.gpt-oss-120b-1:0"
