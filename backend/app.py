"""
Flask Backend for Si'aa - Fixed for YOUR database schema
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import hashlib
from datetime import datetime
from decimal import Decimal
import traceback
import uuid
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
    """Get single space details, including features"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                -- Space basic info
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
                s.FavoriteCount,

                -- Features (from SpaceFeatures table)
                f.FeatureID,
                f.Temperature,
                f.Humidity,
                f.ClimateControlled,
                f.SecuritySystem,
                f.CCTVMonitored,
                f.AccessType,
                f.ParkingAvailable,
                f.LoadingAssistance,
                f.Restrictions,

                -- Provider info
                p.ProviderID,
                p.FirstName + ' ' + p.LastName as ProviderName,
                p.PhoneNumber as ProviderPhone,
                p.Email as ProviderEmail,

                -- Aggregated rating
                ISNULL(AVG(CAST(r.Rating as FLOAT)), 0) as AverageRating,
                COUNT(r.ReviewID) as ReviewCount

            FROM StorageSpaces s
            JOIN StorageProviders p ON s.ProviderID = p.ProviderID
            LEFT JOIN SpaceFeatures f ON s.SpaceID = f.SpaceID
            LEFT JOIN Bookings b ON s.SpaceID = b.SpaceID
            LEFT JOIN Reviews r ON b.BookingID = r.BookingID

            WHERE s.SpaceID = ?

            GROUP BY
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
                s.FavoriteCount,

                f.FeatureID,
                f.Temperature,
                f.Humidity,
                f.ClimateControlled,
                f.SecuritySystem,
                f.CCTVMonitored,
                f.AccessType,
                f.ParkingAvailable,
                f.LoadingAssistance,
                f.Restrictions,

                p.ProviderID,
                p.FirstName,
                p.LastName,
                p.PhoneNumber,
                p.Email
        """, (space_id,))
        
        columns = [column[0] for column in cursor.description]
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Space not found'}), 404
        
        space = dict(zip(columns, row))

        # Convenience mappings for frontend

        # City is not in this table yet, so default to Jeddah unless you add a Locations table
        space['City'] = 'Jeddah'

        # Availability flag
        space['AvailabilityStatus'] = 'Available' if space.get('IsAvailable') else 'Unavailable'

        # Older keys used on frontend
        space['ClimateControl'] = bool(space.get('ClimateControlled'))
        space['SecurityCameras'] = bool(space.get('CCTVMonitored'))

        # 24/7 access derived from AccessType text (e.g. "24/7 access")
        access_type = (space.get('AccessType') or '').lower()
        space['Access24_7'] = ('24' in access_type)

        # Keep booleans explicit (JS will treat 0/1 as false/true-ish anyway)
        space['ParkingAvailableFlag'] = bool(space.get('ParkingAvailable'))
        space['LoadingAssistanceFlag'] = bool(space.get('LoadingAssistance'))

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
    """Create a new booking and a payment record using your real schema"""
    try:
        data = request.json or {}

        seeker_id    = data.get('seekerId')
        space_id     = data.get('spaceId')
        start_date   = data.get('startDate')   # "YYYY-MM-DD"
        end_date     = data.get('endDate')     # "YYYY-MM-DD"
        total_amount = data.get('totalAmount')  # already includes tax/fees from frontend

        # Basic validation
        if not all([seeker_id, space_id, start_date, end_date]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        if total_amount is None:
            return jsonify({'success': False, 'error': 'totalAmount is required'}), 400

        # Convert to proper types
        start_dt = datetime.fromisoformat(start_date)
        end_dt   = datetime.fromisoformat(end_date)

        if end_dt < start_dt:
            return jsonify({'success': False, 'error': 'End date must be after start date'}), 400

        diff_days = (end_dt - start_dt).days or 1
        # Duration in months (approx)
        rental_months = (Decimal(diff_days) / Decimal(30)).quantize(Decimal('0.01'))

        # TotalAmount & PlatformFee as DECIMAL
        total_dec = Decimal(str(total_amount))
        # Example: platform fee = 7% of total
        platform_fee = (total_dec * Decimal('0.07')).quantize(Decimal('0.01'))

        conn = get_db_connection()
        cursor = conn.cursor()

        # Make sure the space exists & is available
        cursor.execute("""
            SELECT IsAvailable, Status
            FROM StorageSpaces
            WHERE SpaceID = ?
        """, (space_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Space not found'}), 404
        if not row[0] or row[1] != 'Active':
            conn.close()
            return jsonify({'success': False, 'error': 'Space is not available'}), 400

        # 1) INSERT into Bookings and get the inserted row via OUTPUT
        cursor.execute("""
            INSERT INTO Bookings (
                SpaceID,
                SeekerID,
                StartDate,
                EndDate,
                RentalDurationMonths,
                TotalAmount,
                PlatformFee,
                BookingStatus,
                CreatedAt
            )
            OUTPUT
                INSERTED.BookingID,
                INSERTED.StartDate,
                INSERTED.EndDate,
                INSERTED.TotalAmount,
                INSERTED.BookingStatus
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, 'Pending', SYSDATETIME()
            )
        """, (
            int(space_id),
            int(seeker_id),
            start_dt,
            end_dt,
            rental_months,
            total_dec,
            platform_fee
        ))

        booking_row = cursor.fetchone()
        if not booking_row:
            conn.rollback()
            conn.close()
            return jsonify({'success': False, 'error': 'Could not create booking'}), 500

        booking_id      = booking_row[0]
        inserted_start  = booking_row[1]
        inserted_end    = booking_row[2]
        inserted_total  = booking_row[3]
        inserted_status = booking_row[4]

        # 2) INSERT into Payments with that BookingID
        transaction_id = str(uuid.uuid4())  # fake transaction ID for now

        cursor.execute("""
            INSERT INTO Payments (
                BookingID,
                PaymentType,
                Amount,
                Currency,
                PaymentMethod,
                PaymentStatus,
                TransactionID,
                PaymentGateway,
                PaymentDate,
                RefundAmount,
                RefundDate,
                RefundReason,
                CreatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), NULL, NULL, NULL, SYSDATETIME())
        """, (
            int(booking_id),     # BookingID
            'Booking',           # PaymentType
            total_dec,           # Amount (DECIMAL)
            'SAR',               # Currency
            'CreditCard',              # PaymentMethod
            'Completed',         # PaymentStatus
            transaction_id,      # TransactionID
            'Manual'             # PaymentGateway (or 'Moyasar', 'Stripe', etc.)
        ))

        # 3) Commit both inserts
        conn.commit()
        conn.close()

        booking = {
            'bookingId': int(booking_id),
            'startDate': inserted_start.isoformat() if inserted_start else None,
            'endDate':   inserted_end.isoformat() if inserted_end else None,
            'totalAmount': float(inserted_total) if inserted_total is not None else 0,
            'bookingStatus': inserted_status
        }

        payment = {
            'bookingId': int(booking_id),
            'amount': float(total_dec),
            'currency': 'SAR',
            'paymentStatus': 'Completed',
            'transactionId': transaction_id
        }

        return jsonify({
            'success': True,
            'message': 'Booking and payment created successfully',
            'booking': booking,
            'payment': payment
        }), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Server error creating booking: {str(e)}'}), 500

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