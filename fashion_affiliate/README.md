# Fashion Affiliate Marketing Website

A full-featured fashion affiliate marketing website built with Flask, featuring product management, affiliate link tracking, and a modern responsive design.

## Features

### Frontend
- **Responsive Design**: Mobile-first design that works on all devices
- **Product Showcase**: Beautiful product cards with images, pricing, and discounts
- **Category Browsing**: Easy navigation through different fashion categories
- **Search Functionality**: Find products quickly with the search feature
- **Product Details**: Detailed product pages with descriptions and related items
- **Affiliate Link Tracking**: Click tracking for all affiliate links

### Backend
- **Flask-based API**: Robust backend built with Python Flask
- **SQLAlchemy ORM**: Database management with SQLAlchemy
- **Admin Dashboard**: Complete admin interface for managing products
- **Analytics**: Track clicks, views, and top-performing products
- **Product Management**: Add, edit, and delete products easily

### Admin Features
- **Secure Login**: Password-protected admin area
- **Dashboard**: Overview of key metrics and performance
- **Product CRUD**: Create, read, update, and delete products
- **Analytics Dashboard**: View top products and recent activity
- **Click Tracking**: Monitor affiliate link performance

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository or navigate to the fashion_affiliate directory**

```bash
cd fashion_affiliate
```

2. **Create a virtual environment (recommended)**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Initialize the database**

```bash
flask --app app init-db
```

This will create the database and a default admin user:
- Username: `admin`
- Password: `admin123`

**IMPORTANT**: Change the default admin password immediately after first login!

5. **Seed the database with sample products (optional)**

```bash
flask --app app seed-products
```

## Running the Application

### Development Server

```bash
python app.py
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Admin Login**: http://localhost:5000/admin/login

### Production Deployment

For production, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Usage

### Admin Access

1. Navigate to `/admin/login`
2. Login with default credentials (admin/admin123)
3. Access the dashboard to:
   - View analytics and statistics
   - Manage products
   - Track affiliate link clicks

### Adding Products

1. Go to Admin > Products > Add New Product
2. Fill in the product details:
   - Name, brand, category
   - Description
   - Current price and original price (for discount calculation)
   - Image URL (use Unsplash or product images)
   - Affiliate link
   - Featured status

### Tracking Affiliate Links

When visitors click "Shop Now" buttons:
1. Click is recorded in the database
2. User is redirected to the affiliate link
3. Analytics are updated in the admin dashboard

## Project Structure

```
fashion_affiliate/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── .gitignore            # Git ignore file
├── static/
│   └── css/
│       └── style.css     # All CSS styles
├── templates/
│   ├── base.html         # Base template
│   ├── index.html        # Homepage
│   ├── products.html     # Products listing
│   ├── product_detail.html  # Product detail page
│   └── admin/
│       ├── base.html     # Admin base template
│       ├── login.html    # Admin login
│       ├── dashboard.html  # Admin dashboard
│       ├── products.html   # Product management
│       └── product_form.html  # Add/Edit product form
└── fashion_affiliate.db  # SQLite database (created on init)
```

## Database Schema

### Product
- id: Primary key
- name: Product name
- description: Product description
- price: Current price
- original_price: Original price (for discounts)
- category: Product category
- brand: Brand name
- image_url: Product image URL
- affiliate_link: Affiliate tracking link
- featured: Boolean for featured products
- created_at: Timestamp

### Click
- id: Primary key
- product_id: Foreign key to Product
- timestamp: Click timestamp
- ip_address: Visitor IP
- user_agent: Browser user agent
- referrer: Referrer URL

### Admin
- id: Primary key
- username: Admin username
- password_hash: Hashed password

## Customization

### Changing Colors
Edit the CSS variables in `static/css/style.css`:

```css
:root {
    --primary-color: #2c3e50;
    --secondary-color: #e74c3c;
    --accent-color: #3498db;
    /* ... more colors */
}
```

### Adding Categories
Categories are automatically created when you add products. To add a new category:
1. Add a product with the new category name
2. The category will appear in the navigation automatically

### Setting Up Real Affiliate Links
1. Sign up for affiliate programs (Amazon Associates, ShareASale, etc.)
2. Get your affiliate links
3. Add products with your affiliate links in the admin panel

## Security Considerations

1. **Change Default Admin Password**: Immediately change the default admin credentials
2. **Use Environment Variables**: Store sensitive data in environment variables
3. **HTTPS**: Use HTTPS in production
4. **Secure Secret Key**: Set a strong SECRET_KEY in production

Example using environment variables:

```python
# Set in production
export SECRET_KEY="your-very-secure-random-secret-key"
export FLASK_ENV="production"
```

## API Endpoints

### Public Routes
- `GET /` - Homepage
- `GET /products` - All products (supports ?category= and ?search=)
- `GET /product/<id>` - Product detail page
- `GET /track/<id>` - Track click and redirect to affiliate link
- `GET /category/<name>` - Category page

### Admin Routes (Login Required)
- `GET/POST /admin/login` - Admin login
- `GET /admin` - Admin dashboard
- `GET /admin/products` - Manage products
- `GET/POST /admin/product/add` - Add new product
- `GET/POST /admin/product/edit/<id>` - Edit product
- `POST /admin/product/delete/<id>` - Delete product

### API Routes
- `GET /api/products` - Get all products (JSON)
- `GET /api/stats` - Get statistics (JSON, admin only)

## Tips for Success

1. **Quality Images**: Use high-quality product images (Unsplash is great for free images)
2. **Accurate Descriptions**: Write compelling product descriptions
3. **Competitive Pricing**: Show clear savings with original vs. current price
4. **Featured Products**: Mark your best-selling items as featured
5. **Regular Updates**: Add new products regularly to keep content fresh
6. **Track Performance**: Use the analytics dashboard to see what's working

## Troubleshooting

### Database Issues
If you encounter database errors:
```bash
rm fashion_affiliate.db  # Delete old database
flask --app app init-db  # Recreate database
```

### Port Already in Use
If port 5000 is already in use:
```bash
python app.py  # Edit app.py and change port to 5001 or another port
```

### Missing Dependencies
If you get import errors:
```bash
pip install -r requirements.txt --upgrade
```

## License

MIT License - Feel free to use this for your affiliate marketing ventures!

## Support

For issues or questions, please open an issue on the GitHub repository.

---

Built with Flask, SQLAlchemy, and modern web technologies.
