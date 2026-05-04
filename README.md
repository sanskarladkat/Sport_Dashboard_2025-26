# 🏆 Sports Dashboard 2025-26

A comprehensive web-based sports management and analytics platform built with Flask and Google Sheets integration. This dashboard provides real-time insights into sports achievements, budgets, facility operations, and departmental performance.

## 📋 Features

### 🎯 **Core Modules**

#### 1. **Achievements Dashboard**
- Track all sports achievements and accomplishments
- View statistics by school, sport, and gender
- Analyze performance metrics and rankings
- Display achievement types and distribution
- Real-time data visualization with interactive charts

#### 2. **Budget Management**
- Monitor actual spending vs. allocated budget
- Track unutilized amounts across categories
- Visualize budget distribution and usage patterns
- Identify cost optimization opportunities

#### 3. **Facility Operations**
- Track facility utilization rates
- Monitor capacity usage by month
- View utilized vs. unused facility capacity
- Optimize resource allocation

#### 4. **Staff Summit**
- Manage staff participation in sports events
- Analyze departmental performance and engagement
- Track individual and team achievements
- Visualize sports participation across departments

#### 5. **Inter-Department Sports**
- Manage cross-department competitions
- Track participants and point systems
- Analyze school-wise performance
- Monitor results (1st, 2nd, 3rd positions)

#### 6. **Landing Page**
- Dynamic image gallery of winners
- Quick access to all dashboard modules

## 🛠️ **Tech Stack**

- **Backend:** Flask (Python Web Framework)
- **Frontend:** HTML5, CSS3, JavaScript
- **Database:** Google Sheets API with Gspread
- **Data Processing:** Pandas
- **Authentication:** OAuth2 with Google Service Accounts
- **Caching:** Flask-Caching (5-minute cache)
- **Visualization:** Matplotlib, Chart.js
- **Deployment:** Procfile-ready for Heroku

## 📦 **Dependencies**

- Flask
- pandas
- gspread
- oauth2client
- flask-caching
- matplotlib

## 🚀 **Getting Started**

### Prerequisites
- Python 3.7+
- Google Cloud Project with Sheets API enabled
- Service Account credentials JSON

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanskarladkat/Sport_Dashboard_2025-26.git
   cd "Sports Dashboard 2025-26"
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\Activate.ps1
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Google Sheets Integration**
   - Download service account credentials from Google Cloud Console
   - Save as `credentials.json` in project root
   - Or set `GCP_CREDS` environment variable with credentials JSON

5. **Run the application**
   ```bash
   python app.py
   ```
   - Access at `http://localhost:5000`

## 📊 **API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page with winner images |
| `/achievements` | GET | Achievements dashboard |
| `/api/data` | GET | Achievement data and KPIs |
| `/budget` | GET | Budget dashboard |
| `/api/budget` | GET | Budget breakdown data |
| `/operations` | GET | Facility operations dashboard |
| `/api/operations` | GET | Facility utilization data |
| `/staff-summit` | GET | Staff summit dashboard |
| `/api/staff_data` | GET | Staff achievement data |
| `/inter_department` | GET | Inter-department sports dashboard |
| `/api/inter_department_data` | GET | Inter-department competition data |

## 📁 **Project Structure**

```
Sports Dashboard 2025-26/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── credentials.json            # Google Cloud credentials
├── Procfile                    # Heroku deployment config
│
├── templates/                  # HTML templates
│   ├── index.html             # Landing page
│   ├── dashboard.html         # Achievements dashboard
│   ├── budget.html            # Budget dashboard
│   ├── operations.html        # Facility operations
│   ├── staff.html             # Staff summit
│   └── inter_department.html  # Inter-department sports
│
└── static/                     # Static assets
    ├── css/                    # Stylesheets
    │   ├── dashboard_style.css
    │   ├── budget_style.css
    │   ├── operations_style.css
    │   ├── staff_style.css
    │   ├── inter_dept_style.css
    │   └── index_style.css
    ├── js/                     # JavaScript files
    │   ├── dashboard_script.js
    │   ├── budget_script.js
    │   ├── operations_script.js
    │   ├── staff_script.js
    │   ├── inter_dept_script.js
    │   └── index_script.js
    └── images/                 # Image assets
```

## 🔑 **Key Features Explained**

### Data Integration
- **Real-time Google Sheets Sync:** All data is pulled directly from Google Sheets
- **Automatic Data Normalization:** Column names are standardized automatically
- **Smart Data Processing:** Handles missing values, type conversions, and data cleaning

### Performance
- **Intelligent Caching:** 5-minute cache reduces API calls and improves load times
- **Query String-based Caching:** Separate cache entries for different query parameters
- **Error Handling:** Graceful fallbacks for API failures

### Analytics
- **KPI Metrics:** Key performance indicators for quick insights
- **Multi-dimensional Analysis:** Filter by school, sport, department, and more
- **Visual Dashboards:** Interactive charts and graphs for data visualization

## 📈 **Data Models**

### Achievements Sheet
- Student Name, School, Department, Gender
- Sport, Points, Results, Venue, Rank
- Event categorization

### Budget Sheet
- Description, Actual Spend, Unutilized Amount
- Category-wise budget allocation

### Operations Sheet
- Games/Facilities, Utilization %, Capacity %, Month
- Monthly facility usage tracking

### Staff Summit Sheet
- Name, Department, Gender, Sport, Points
- Staff achievement tracking

### Inter-Department Sheet
- Student Name, School, Sport, Results, Participants
- Cross-department competition data

## 🔐 **Security**

- OAuth2 authentication for Google Sheets API
- Environment variables for sensitive credentials
- Service account-based access
- Secure credential handling with optional environment variable override

## 🌐 **Deployment**

### Heroku Deployment
```bash
heroku login
heroku create your-app-name
heroku config:set GCP_CREDS='your-credentials-json'
git push heroku main
```

The application includes a `Procfile` for seamless Heroku deployment.

## 🐛 **Troubleshooting**

### Common Issues

1. **Google Sheets API Errors**
   - Verify service account has sheet access
   - Check sheet URLs in app.py
   - Ensure credentials.json is valid

2. **Data Not Loading**
   - Check Google Sheets connectivity
   - Verify correct sheet names
   - Review error logs

3. **Performance Issues**
   - Cache settings can be adjusted in app.py
   - Monitor API rate limits
   - Check database load

## 📝 **Future Enhancements**

- [ ] User authentication and authorization
- [ ] Advanced filtering and search capabilities
- [ ] Export functionality (PDF, Excel)
- [ ] Real-time notifications
- [ ] Mobile-responsive improvements
- [ ] Database migration from Google Sheets
- [ ] Advanced analytics and predictive models

## 👥 **Contributing**

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## 📄 **License**

This project is licensed under the MIT License - see LICENSE file for details.

## 📧 **Contact**

For questions or support, please contact the development team.

---

**Last Updated:** May 2026  
**Version:** 2025-26  
**Status:** Active Development
