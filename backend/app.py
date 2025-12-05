"""
Si'aa Platform Backend API
Semantic Search using sentence-transformers/all-MiniLM-L6-v2
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Load the sentence transformer model
print("Loading sentence transformer model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
print("Model loaded successfully!")

# In-memory storage for demo (in production, use a database)
storage_spaces = []

def load_storage_spaces():
    """Load storage spaces from JSON file if it exists"""
    global storage_spaces
    if os.path.exists('storage_spaces.json'):
        with open('storage_spaces.json', 'r', encoding='utf-8') as f:
            storage_spaces = json.load(f)
    return storage_spaces

def save_storage_spaces():
    """Save storage spaces to JSON file"""
    with open('storage_spaces.json', 'w', encoding='utf-8') as f:
        json.dump(storage_spaces, f, ensure_ascii=False, indent=2)

def create_space_embedding(space: Dict) -> np.ndarray:
    """
    Create a text description from storage space data and convert to embedding
    """
    # Combine all relevant text fields into one description
    description_parts = []
    
    if space.get('title'):
        
        description_parts.append(space['title'])
    
    if space.get('description'):
        description_parts.append(space['description'])
    
    if space.get('type'):
        description_parts.append(f"Type: {space['type']}")
    
    if space.get('neighborhood'):
        description_parts.append(f"Location: {space['neighborhood']}")
    
    if space.get('size'):
        description_parts.append(f"Size: {space['size']} m²")
    
    if space.get('conditions'):
        conditions = ', '.join(space['conditions'])
        description_parts.append(f"Features: {conditions}")
    
    if space.get('items_type'):
        description_parts.append(f"Suitable for: {space['items_type']}")
    
    if space.get('access_type'):
        description_parts.append(f"Access: {space['access_type']}")
    
    full_description = ' '.join(description_parts)
    embedding = model.encode(full_description, normalize_embeddings=True)
    return embedding

def calculate_similarity(query_embedding: np.ndarray, space_embedding: np.ndarray) -> float:
    """Calculate cosine similarity between query and space embeddings"""
    return float(np.dot(query_embedding, space_embedding))

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model': 'all-MiniLM-L6-v2'})

@app.route('/api/spaces', methods=['POST'])
def create_space():
    """Create a new storage space listing"""
    data = request.json
    
    # Generate embedding for the new space
    space_embedding = create_space_embedding(data)
    data['embedding'] = space_embedding.tolist()
    data['id'] = len(storage_spaces) + 1
    
    storage_spaces.append(data)
    save_storage_spaces()
    
    return jsonify({
        'success': True,
        'space_id': data['id'],
        'message': 'Storage space created successfully'
    }), 201

@app.route('/api/spaces', methods=['GET'])
def get_spaces():
    """Get all storage spaces (for testing)"""
    return jsonify({
        'success': True,
        'count': len(storage_spaces),
        'spaces': storage_spaces
    })

@app.route('/api/search', methods=['POST'])
def semantic_search():
    """
    Semantic search endpoint
    Takes user search query and filters, returns top matching storage spaces
    """
    data = request.json
    query_text = data.get('query', '')
    filters = data.get('filters', {})
    
    if not query_text and not filters:
        return jsonify({
            'success': False,
            'message': 'Please provide a search query or filters'
        }), 400
    
    # Build search query text from filters and user query
    search_parts = []
    
    if query_text:
        search_parts.append(query_text)
    
    if filters.get('location_neighborhood'):
        search_parts.append(f"Location: {filters['location_neighborhood']}")
    
    if filters.get('storage_size'):
        search_parts.append(f"Size: {filters['storage_size']}")
    
    if filters.get('items_type'):
        search_parts.append(f"Items: {filters['items_type']}")
    
    if filters.get('rental_duration'):
        search_parts.append(f"Duration: {filters['rental_duration']}")
    
    if filters.get('environment'):
        env_features = ', '.join(filters['environment'])
        search_parts.append(f"Features: {env_features}")
    
    # Combine all search criteria
    full_query = ' '.join(search_parts) if search_parts else "storage space"
    
    # Convert query to embedding
    query_embedding = model.encode(full_query, normalize_embeddings=True)
    
    # Calculate similarity scores for all spaces
    results = []
    for space in storage_spaces:
        # Apply basic filters first
        if filters.get('location_neighborhood') and space.get('neighborhood') != filters['location_neighborhood']:
            continue
        
        if filters.get('price_max'):
            space_price = space.get('price', 0)
            if space_price > filters['price_max']:
                continue
        
        # Calculate semantic similarity
        space_embedding = np.array(space.get('embedding', []))
        if len(space_embedding) > 0:
            similarity = calculate_similarity(query_embedding, space_embedding)
            
            results.append({
                'space': space,
                'similarity_score': similarity,
                'match_percentage': round(similarity * 100, 1)
            })
    
    # Sort by similarity score (highest first)
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    # Return top results (limit to top 20)
    top_results = results[:20]
    
    return jsonify({
        'success': True,
        'query': full_query,
        'count': len(top_results),
        'results': [
            {
                'id': r['space']['id'],
                'title': r['space'].get('title', ''),
                'neighborhood': r['space'].get('neighborhood', ''),
                'type': r['space'].get('type', ''),
                'size': r['space'].get('size', ''),
                'price': r['space'].get('price', 0),
                'description': r['space'].get('description', ''),
                'conditions': r['space'].get('conditions', []),
                'access_type': r['space'].get('access_type', ''),
                'match_score': r['match_percentage'],
                'similarity': r['similarity_score']
            }
            for r in top_results
        ]
    })

@app.route('/api/spaces/<int:space_id>', methods=['GET'])
def get_space(space_id):
    """Get a specific storage space by ID"""
    space = next((s for s in storage_spaces if s.get('id') == space_id), None)
    
    if not space:
        return jsonify({
            'success': False,
            'message': 'Storage space not found'
        }), 404
    
    # Remove embedding from response (not needed for frontend)
    space_copy = {k: v for k, v in space.items() if k != 'embedding'}
    
    return jsonify({
        'success': True,
        'space': space_copy
    })

if __name__ == '__main__':
    # Load existing storage spaces
    load_storage_spaces()
    
    # Run the Flask app
    print("\n" + "="*50)
    print("Si'aa Platform Backend API")
    print("Semantic Search using sentence-transformers/all-MiniLM-L6-v2")
    print("="*50)
    print("\nAPI Endpoints:")
    print("  POST /api/spaces - Create new storage space")
    print("  GET  /api/spaces - Get all spaces")
    print("  POST /api/search - Semantic search")
    print("  GET  /api/spaces/<id> - Get specific space")
    print("\nStarting server on http://localhost:5000")
    print("="*50 + "\n")
    
    app.run(debug=True, port=5000)


