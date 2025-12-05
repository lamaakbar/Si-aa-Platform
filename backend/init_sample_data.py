"""
Initialize sample storage spaces data for testing
Run this script to populate the database with sample data
"""

import json
import requests
import sys

API_BASE_URL = 'http://localhost:5000/api'

# Sample storage spaces data
sample_spaces = [
    {
        "title": "Indoor Storage Room · Al-Salama",
        "neighborhood": "al-salama",
        "type": "Indoor room",
        "size": 5,
        "price": 180,
        "description": "Ideal for boxes, luggage, and small furniture. Secure building with daytime access. Climate-controlled environment perfect for sensitive items.",
        "conditions": ["temperature", "climate", "secure"],
        "items_type": "boxes-only",
        "access_type": "daytime",
        "rental_duration": "monthly"
    },
    {
        "title": "Spacious Garage Storage · Al-Rawdah",
        "neighborhood": "al-rawdah",
        "type": "Garage / parking",
        "size": 10,
        "price": 350,
        "description": "Large covered garage space suitable for vehicles, large furniture, and multiple boxes. 24/7 access with security gate.",
        "conditions": ["dry", "secure"],
        "items_type": "vehicle",
        "access_type": "24-7",
        "rental_duration": "monthly"
    },
    {
        "title": "Climate-Controlled Warehouse Corner · Al-Nahda",
        "neighborhood": "al-nahda",
        "type": "Warehouse corner",
        "size": 8,
        "price": 280,
        "description": "Professional warehouse space with climate control. Perfect for electronics, documents, and temperature-sensitive items. Humidity-controlled environment.",
        "conditions": ["temperature", "climate", "humidity", "secure"],
        "items_type": "furniture",
        "access_type": "scheduled",
        "rental_duration": "monthly"
    },
    {
        "title": "Small Indoor Storage · Al-Andalus",
        "neighborhood": "al-andalus",
        "type": "Indoor room",
        "size": 3,
        "price": 120,
        "description": "Compact storage room ideal for boxes and luggage only. Clean, dry environment. Daytime access available.",
        "conditions": ["dry"],
        "items_type": "boxes-only",
        "access_type": "daytime",
        "rental_duration": "monthly"
    },
    {
        "title": "Outdoor Covered Area · Al-Hamra",
        "neighborhood": "al-hamra",
        "type": "Outdoor covered area",
        "size": 15,
        "price": 450,
        "description": "Large outdoor covered storage area. Perfect for large items, vehicles, and equipment. Secure fencing and 24/7 access.",
        "conditions": ["secure"],
        "items_type": "vehicle",
        "access_type": "24-7",
        "rental_duration": "monthly"
    },
    {
        "title": "Premium Climate Storage · Al-Rehab",
        "neighborhood": "al-rehab",
        "type": "Indoor room",
        "size": 6,
        "price": 320,
        "description": "Premium storage with full climate control. Temperature, humidity, and climate-controlled. Ideal for valuable items, antiques, and electronics.",
        "conditions": ["temperature", "climate", "humidity", "secure"],
        "items_type": "furniture",
        "access_type": "24-7",
        "rental_duration": "monthly"
    },
    {
        "title": "Budget Storage Room · Al-Faisaliyah",
        "neighborhood": "al-faisaliyah",
        "type": "Indoor room",
        "size": 4,
        "price": 100,
        "description": "Affordable storage solution for boxes and small items. Basic dry storage with scheduled access.",
        "conditions": ["dry"],
        "items_type": "boxes-only",
        "access_type": "scheduled",
        "rental_duration": "monthly"
    },
    {
        "title": "Large Warehouse Space · Al-Naeem",
        "neighborhood": "al-naeem",
        "type": "Warehouse corner",
        "size": 12,
        "price": 500,
        "description": "Spacious warehouse corner with climate control. Suitable for large furniture, business inventory, and equipment storage.",
        "conditions": ["temperature", "climate", "secure"],
        "items_type": "furniture",
        "access_type": "24-7",
        "rental_duration": "monthly"
    }
]

def check_server():
    """Check if the server is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def add_sample_spaces():
    """Add sample spaces to the database"""
    print("Adding sample storage spaces...")
    print("=" * 50)
    
    for i, space in enumerate(sample_spaces, 1):
        try:
            response = requests.post(
                f"{API_BASE_URL}/spaces",
                json=space,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 201:
                data = response.json()
                print(f"✓ Added: {space['title']} (ID: {data.get('space_id', 'N/A')})")
            else:
                print(f"✗ Failed to add: {space['title']} - {response.status_code}")
        except Exception as e:
            print(f"✗ Error adding {space['title']}: {str(e)}")
    
    print("=" * 50)
    print("Done!")

if __name__ == '__main__':
    print("\nSi'aa Platform - Sample Data Initializer")
    print("=" * 50)
    
    if not check_server():
        print("\n❌ Error: Backend server is not running!")
        print("Please start the server first:")
        print("  cd backend")
        print("  python app.py")
        print("\nThen run this script again.")
        sys.exit(1)
    
    print("\n✓ Backend server is running")
    print("\nInitializing sample data...\n")
    
    add_sample_spaces()
    
    print("\nYou can now test the search functionality!")


