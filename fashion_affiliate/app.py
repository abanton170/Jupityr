"""
Fashion Affiliate Marketing Website
Main Flask Application
"""
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import hashlib
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fashion_affiliate.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float)
    category = db.Column(db.String(100))
    brand = db.Column(db.String(100))
    image_url = db.Column(db.String(500))
    affiliate_link = db.Column(db.String(500), nullable=False)
    featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    clicks = db.relationship('Click', backref='product', lazy=True)

    def discount_percentage(self):
        if self.original_price and self.original_price > self.price:
            return int(((self.original_price - self.price) / self.original_price) * 100)
        return 0

class Click(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    referrer = db.Column(db.String(500))

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password):
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password):
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Public Routes
@app.route('/')
def index():
    featured_products = Product.query.filter_by(featured=True).limit(6).all()
    latest_products = Product.query.order_by(Product.created_at.desc()).limit(8).all()
    categories = db.session.query(Product.category).distinct().all()
    return render_template('index.html',
                         featured_products=featured_products,
                         latest_products=latest_products,
                         categories=[c[0] for c in categories if c[0]])

@app.route('/products')
def products():
    category = request.args.get('category')
    search = request.args.get('search')

    query = Product.query

    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Product.name.contains(search) |
                           Product.description.contains(search))

    all_products = query.order_by(Product.created_at.desc()).all()
    categories = db.session.query(Product.category).distinct().all()

    return render_template('products.html',
                         products=all_products,
                         categories=[c[0] for c in categories if c[0]],
                         current_category=category)

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    related_products = Product.query.filter(
        Product.category == product.category,
        Product.id != product_id
    ).limit(4).all()
    return render_template('product_detail.html',
                         product=product,
                         related_products=related_products)

@app.route('/track/<int:product_id>')
def track_click(product_id):
    product = Product.query.get_or_404(product_id)

    # Record click
    click = Click(
        product_id=product_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        referrer=request.referrer
    )
    db.session.add(click)
    db.session.commit()

    return redirect(product.affiliate_link)

@app.route('/category/<category_name>')
def category(category_name):
    products = Product.query.filter_by(category=category_name).all()
    return render_template('category.html',
                         products=products,
                         category=category_name)

# Admin Routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        admin = Admin.query.filter_by(username=username).first()
        if admin and admin.check_password(password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            return redirect(url_for('admin_dashboard'))

        return render_template('admin/login.html', error='Invalid credentials')

    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin_dashboard():
    total_products = Product.query.count()
    total_clicks = Click.query.count()
    recent_clicks = Click.query.order_by(Click.timestamp.desc()).limit(10).all()

    # Top products by clicks
    top_products = db.session.query(
        Product.name,
        db.func.count(Click.id).label('click_count')
    ).join(Click).group_by(Product.id).order_by(db.desc('click_count')).limit(5).all()

    return render_template('admin/dashboard.html',
                         total_products=total_products,
                         total_clicks=total_clicks,
                         recent_clicks=recent_clicks,
                         top_products=top_products)

@app.route('/admin/products')
@login_required
def admin_products():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin/products.html', products=products)

@app.route('/admin/product/add', methods=['GET', 'POST'])
@login_required
def admin_add_product():
    if request.method == 'POST':
        product = Product(
            name=request.form.get('name'),
            description=request.form.get('description'),
            price=float(request.form.get('price')),
            original_price=float(request.form.get('original_price')) if request.form.get('original_price') else None,
            category=request.form.get('category'),
            brand=request.form.get('brand'),
            image_url=request.form.get('image_url'),
            affiliate_link=request.form.get('affiliate_link'),
            featured=bool(request.form.get('featured'))
        )
        db.session.add(product)
        db.session.commit()
        return redirect(url_for('admin_products'))

    return render_template('admin/product_form.html', product=None)

@app.route('/admin/product/edit/<int:product_id>', methods=['GET', 'POST'])
@login_required
def admin_edit_product(product_id):
    product = Product.query.get_or_404(product_id)

    if request.method == 'POST':
        product.name = request.form.get('name')
        product.description = request.form.get('description')
        product.price = float(request.form.get('price'))
        product.original_price = float(request.form.get('original_price')) if request.form.get('original_price') else None
        product.category = request.form.get('category')
        product.brand = request.form.get('brand')
        product.image_url = request.form.get('image_url')
        product.affiliate_link = request.form.get('affiliate_link')
        product.featured = bool(request.form.get('featured'))

        db.session.commit()
        return redirect(url_for('admin_products'))

    return render_template('admin/product_form.html', product=product)

@app.route('/admin/product/delete/<int:product_id>', methods=['POST'])
@login_required
def admin_delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return redirect(url_for('admin_products'))

# API Routes
@app.route('/api/products')
def api_products():
    products = Product.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'category': p.category,
        'image_url': p.image_url
    } for p in products])

@app.route('/api/stats')
@login_required
def api_stats():
    total_clicks = Click.query.count()
    products_count = Product.query.count()

    return jsonify({
        'total_clicks': total_clicks,
        'total_products': products_count
    })

# Initialize database and create default admin
@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()

    # Create default admin if not exists
    if not Admin.query.filter_by(username='admin').first():
        admin = Admin(username='admin')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('Database initialized! Default admin created (username: admin, password: admin123)')
    else:
        print('Database initialized!')

@app.cli.command()
def seed_products():
    """Seed database with sample products."""
    sample_products = [
        {
            'name': 'Classic Leather Jacket',
            'description': 'Premium leather jacket with timeless design. Perfect for any season.',
            'price': 199.99,
            'original_price': 299.99,
            'category': 'Outerwear',
            'brand': 'StyleCo',
            'image_url': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
            'affiliate_link': 'https://example.com/affiliate/leather-jacket',
            'featured': True
        },
        {
            'name': 'Designer Sunglasses',
            'description': 'Stylish UV-protected sunglasses with polarized lenses.',
            'price': 89.99,
            'original_price': 129.99,
            'category': 'Accessories',
            'brand': 'VisionLux',
            'image_url': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
            'affiliate_link': 'https://example.com/affiliate/sunglasses',
            'featured': True
        },
        {
            'name': 'Premium Sneakers',
            'description': 'Comfortable and stylish sneakers for everyday wear.',
            'price': 129.99,
            'original_price': 159.99,
            'category': 'Footwear',
            'brand': 'StepUp',
            'image_url': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500',
            'affiliate_link': 'https://example.com/affiliate/sneakers',
            'featured': True
        },
        {
            'name': 'Silk Scarf',
            'description': 'Luxurious silk scarf with elegant patterns.',
            'price': 49.99,
            'original_price': 79.99,
            'category': 'Accessories',
            'brand': 'SilkStyle',
            'image_url': 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500',
            'affiliate_link': 'https://example.com/affiliate/silk-scarf',
            'featured': False
        },
        {
            'name': 'Denim Jeans',
            'description': 'Classic fit denim jeans with premium quality fabric.',
            'price': 79.99,
            'original_price': 99.99,
            'category': 'Bottoms',
            'brand': 'DenimCo',
            'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
            'affiliate_link': 'https://example.com/affiliate/denim-jeans',
            'featured': False
        },
        {
            'name': 'Cashmere Sweater',
            'description': 'Soft cashmere sweater for ultimate comfort and style.',
            'price': 149.99,
            'original_price': 199.99,
            'category': 'Tops',
            'brand': 'CozyCash',
            'image_url': 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500',
            'affiliate_link': 'https://example.com/affiliate/cashmere-sweater',
            'featured': True
        }
    ]

    for product_data in sample_products:
        product = Product(**product_data)
        db.session.add(product)

    db.session.commit()
    print(f'Added {len(sample_products)} sample products!')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
