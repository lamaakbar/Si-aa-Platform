"""
Flask Backend for Si'aa - Fixed for YOUR database schema
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import hashlib

app = Flask(__name__)
CORS(app)

# Database Configuration - UPDATE WITH YOUR CREDENTIALS
DB_CONFIG = {
    'server': 'siaa.database.windows.net',
    'database': 'Siaa',
    'username': 'Lama1292',
    'password': 'Lama123!!',
    'driver': '{ODBC Driver 17 for SQL Server}'
}

def get_db_connection():
    """Create and return database connection"""
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']}"
    )
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

# =============================================
# AUTHENTICATION ENDPOINTS
# =============================================

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        hashed_password = hash_password(password)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Try Seeker
        cursor.execute("""
            SELECT SeekerID, FirstName, LastName, Email, PhoneNumber
            FROM StorageSeekers
            WHERE Email = ? AND Password = ?
        """, (email, hashed_password))
        
        user = cursor.fetchone()
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'userId': user[0],
                    'userType': 'seeker',
                    'name': f"{user[1]} {user[2]}",
                    'email': user[3],
                    'phone': user[4]
                }
            })
        
        # Try Provider
        cursor.execute("""
            SELECT ProviderID, FirstName, LastName, Email, PhoneNumber
            FROM StorageProviders
            WHERE Email = ? AND Password = ?
        """, (email, hashed_password))
        
        user = cursor.fetchone()
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'userId': user[0],
                    'userType': 'provider',
                    'name': f"{user[1]} {user[2]}",
                    'email': user[3],
                    'phone': user[4]
                }
            })
        
        conn.close()
        return jsonify({'error': 'Invalid email or password'}), 401
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Server error during login'}), 500

# =============================================
# SEARCH ENDPOINTS - FIXED FOR YOUR SCHEMA
# =============================================

@app.route('/api/spaces/search', methods=['GET'])
def search_spaces():
    """Search for storage spaces - Using YOUR actual column names"""
    try:
        # Get query parameters
        search_term = request.args.get('searchTerm', '')
        space_type = request.args.get('spaceType', '')
        min_price = request.args.get('minPrice', type=float)
        max_price = request.args.get('maxPrice', type=float)
        min_size = request.args.get('minSize', type=float)
        max_size = request.args.get('maxSize', type=float)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query using YOUR actual column names
        query = """
            SELECT 
                s.SpaceID,
                s.Title,
                s.Description,
                s.SpaceType,
                s.Size,
                s.PricePerMonth,
                s.PricePerWeek,
                s.PricePerDay,
                s.IsAvailable,
                s.Status,
                p.FirstName + ' ' + p.LastName as ProviderName,
                p.PhoneNumber as ProviderPhone,
                ISNULL(AVG(CAST(r.Rating as FLOAT)), 0) as AverageRating,
                COUNT(r.ReviewID) as ReviewCount
            FROM StorageSpaces s
            JOIN StorageProviders p ON s.ProviderID = p.ProviderID
            LEFT JOIN Bookings b ON s.SpaceID = b.SpaceID
            LEFT JOIN Reviews r ON b.BookingID = r.BookingID
            WHERE s.IsAvailable = 1 AND s.Status = 'Active'
        """
        
        params = []
        
        # Add filters
        if space_type:
            query += " AND s.SpaceType = ?"
            params.append(space_type)
        
        if min_price:
            query += " AND s.PricePerMonth >= ?"
            params.append(min_price)
        
        if max_price:
            query += " AND s.PricePerMonth <= ?"
            params.append(max_price)
        
        if min_size:
            query += " AND s.Size >= ?"
            params.append(min_size)
        
        if max_size:
            query += " AND s.Size <= ?"
            params.append(max_size)
        
        if search_term:
            query += " AND (s.Title LIKE ? OR s.Description LIKE ?)"
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern])
        
        query += """
            GROUP BY 
                s.SpaceID, s.Title, s.Description, s.SpaceType, s.Size,
                s.PricePerMonth, s.PricePerWeek, s.PricePerDay,
                s.IsAvailable, s.Status,
                p.FirstName, p.LastName, p.PhoneNumber
            ORDER BY s.PricePerMonth ASC
        """
        
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            space_dict = dict(zip(columns, row))
            
            # Map YOUR columns to expected format for JavaScript
            space_dict['SizeInSqMeters'] = space_dict.get('Size', 0)
            space_dict['City'] = 'Jeddah'  # Default to Jeddah
            space_dict['Location'] = space_dict.get('Description', '')[:50]  # Use part of description
            space_dict['AvailabilityStatus'] = 'Available' if space_dict.get('IsAvailable') else 'Unavailable'
            space_dict['ClimateControl'] = False  # Default values
            space_dict['SecurityCameras'] = False
            space_dict['Access24_7'] = False
            space_dict['ImageURL'] = '../Media/default-storage.png'  # Default image
            
            results.append(space_dict)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'spaces': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/spaces/<int:space_id>', methods=['GET'])
def get_space(space_id):
    """Get single space details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                s.*,
                p.ProviderID,
                p.FirstName + ' ' + p.LastName as ProviderName,
                p.PhoneNumber as ProviderPhone,
                p.Email as ProviderEmail,
                ISNULL(AVG(CAST(r.Rating as FLOAT)), 0) as AverageRating,
                COUNT(r.ReviewID) as ReviewCount
            FROM StorageSpaces s
            JOIN StorageProviders p ON s.ProviderID = p.ProviderID
            LEFT JOIN Bookings b ON s.SpaceID = b.SpaceID
            LEFT JOIN Reviews r ON b.BookingID = r.BookingID
            WHERE s.SpaceID = ?
            GROUP BY 
                s.SpaceID, s.ProviderID, s.Title, s.Description, s.SpaceType,
                s.Size, s.Height, s.Width, s.Length,
                s.PricePerMonth, s.PricePerWeek, s.PricePerDay,
                s.MinRentalPeriod, s.MaxRentalPeriod, s.FloorNumber,
                s.IsAvailable, s.FavoriteCount, s.Status,
                p.ProviderID, p.FirstName, p.LastName, p.PhoneNumber, p.Email
        """, (space_id,))
        
        columns = [column[0] for column in cursor.description]
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Space not found'}), 404
        
        space = dict(zip(columns, row))
        
        # Map to expected format
        space['SizeInSqMeters'] = space.get('Size', 0)
        space['City'] = 'Jeddah'
        space['AvailabilityStatus'] = 'Available' if space.get('IsAvailable') else 'Unavailable'
        
        conn.close()
        
        return jsonify({
            'success': True,
            'space': space
        })
        
    except Exception as e:
        print(f"Get space error: {e}")
        return jsonify({'error': 'Server error fetching space'}), 500

# =============================================
# BOOKING ENDPOINTS
# =============================================

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    """Create a new booking"""
    try:
        data = request.json
        seeker_id = data.get('seekerId')
        space_id = data.get('spaceId')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        total_amount = data.get('totalAmount')
        
        if not all([seeker_id, space_id, start_date, end_date]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if space is available
        cursor.execute("""
            SELECT IsAvailable, PricePerMonth, Status
            FROM StorageSpaces
            WHERE SpaceID = ?
        """, (space_id,))
        
        space = cursor.fetchone()
        if not space:
            conn.close()
            return jsonify({'error': 'Space not found'}), 404
        
        if not space[0] or space[2] != 'Active':
            conn.close()
            return jsonify({'error': 'Space is not available'}), 400
        
        # Create booking
        cursor.execute("""
            INSERT INTO Bookings (SeekerID, SpaceID, StartDate, EndDate, BookingStatus, TotalAmount, BookingDate)
            OUTPUT INSERTED.BookingID, INSERTED.StartDate, INSERTED.EndDate, INSERTED.TotalAmount, INSERTED.BookingStatus
            VALUES (?, ?, ?, ?, 'Pending', ?, GETDATE())
        """, (seeker_id, space_id, start_date, end_date, total_amount))
        
        row = cursor.fetchone()
        booking = {
            'bookingId': row[0],
            'startDate': row[1].isoformat() if row[1] else None,
            'endDate': row[2].isoformat() if row[2] else None,
            'totalAmount': float(row[3]) if row[3] else 0,
            'bookingStatus': row[4]
        }
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking': booking
        }), 201
        
    except Exception as e:
        print(f"Booking creation error: {e}")
        return jsonify({'error': 'Server error creating booking'}), 500

# =============================================
# HEALTH CHECK
# =============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM StorageSpaces")
        count = cursor.fetchone()[0]
        conn.close()
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'spaces_count': count
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 500

# =============================================
# RUN SERVER
# =============================================

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Si'aa Flask Backend Starting...")
    print("=" * 50)
    print(f"Database: {DB_CONFIG['database']}")
    print(f"Server: {DB_CONFIG['server']}")
    print(f"API URL: http://localhost:5000/api")
    print("=" * 50)
    print("\nNote: Using YOUR database schema:")
    print("- Size (not SizeInSqMeters)")
    print("- IsAvailable (not AvailabilityStatus)")
    print("- Status (Active/Inactive)")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)