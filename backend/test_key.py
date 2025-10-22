import os
import google.generativeai as genai
from dotenv import load_dotenv

print("--- Starting API Key Test ---")

# 1. Load environment variables from .env file
print("1. Loading .env file...")
load_dotenv()

# 2. Read the API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("\n🔴 FATAL ERROR: GOOGLE_API_KEY not found in .env file.")
    print("   Please check your .env file exists and the variable is named correctly.")
else:
    print("2. API Key found in environment.")
    # Print only the first and last characters for security
    print(f"   Key starts with: {GOOGLE_API_KEY[:4]} and ends with: {GOOGLE_API_KEY[-4:]}")
    
    try:
        # 3. Configure the library
        print("3. Configuring the Google AI library...")
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # 4. Initialize the model
        # This is the corrected line
        model_name = 'gemini-1.5-flash'
        print(f"4. Initializing model: {model_name}...")
        model = genai.GenerativeModel(model_name)
        
        # 5. Send a test prompt
        print("5. Sending a test prompt to Google...")
        response = model.generate_content("Hello, world.")
        
        print("\n✅ SUCCESS! The API key and setup are working.")
        print("   Response from Gemini:", response.text)

    except Exception as e:
        print(f"\n❌ FAILED: An error occurred during the API call.")
        print(f"   Error details: {e}")

print("\n--- Test Finished ---")