# Si-aa-Platform
Si'aa (سعة) – A smart community-driven storage marketplace built for Saudi Arabia. This platform connects users needing storage with nearby available spaces.

## AI Matching - The First Functionality 

This platform now includes **AI Matching** using the `sentence-transformers/all-MiniLM-L6-v2` model. The system converts text descriptions to embeddings (vectors) and finds the best matching storage spaces based on semantic similarity

### Quick Start

1. **Install Backend Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the Backend Server**
   ```bash
   python app.py
   ```
   The server will run on `http://localhost:5000`

3. **Initialize Sample Data** (mock data)
   ```bash
   python init_sample_data.py
   ```

4. **Open the Frontend**
   - Open `HTML/search.html` 
   - Fill the search filters
   - Click "Search & Get Recommendations"
   - Results will be ranked by AI match score!

### How It Works

- **Text Embeddings**: Storage descriptions are converted to 384-dimensional vectors
- **Semantic Matching**: User queries are matched against all spaces using cosine similarity
- **Smart Ranking**: Results are sorted by match percentage (highest similarity first)
- **Filter Integration**: Combines AI matching with traditional filters (location, price, size)
