# Add 'request' to handle URL parameters
from flask import Flask, jsonify, render_template, request
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import traceback
import os
import json

app = Flask(__name__)

# --- HELPER FUNCTION 1: Authentication ---
def get_gspread_client():
    """
    Authenticates with Google Sheets using dual-mode (Env Var or local file)
    and returns the gspread client.
    """
    scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
    
    # Try to load from environment variable (for Render)
    creds_json_str = os.environ.get('GCP_CREDS')
    if creds_json_str:
        creds_dict = json.loads(creds_json_str)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    else:
        # Fallback to local file (for local testing)
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    
    # Authorize the client
    return gspread.authorize(creds)

# --- HELPER FUNCTION 2: Data Fetching (Main Data - Student Achievements) ---
def get_sheet_dataframe():
    """
    Connects to the ORIGINAL Google Sheet for student data.
    USES SAFE READING (get_all_values) to avoid 'Duplicate Header' errors.
    """
    client = get_gspread_client()
    
    # URL for Student/Sports Data
    sheet_url = 'https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit?gid=0#gid=0'
    spreadsheet = client.open_by_url(sheet_url)
    sheet = spreadsheet.sheet1
    
    # --- SAFE READ METHOD START ---
    raw_data = sheet.get_all_values()
    
    if not raw_data:
        return pd.DataFrame() 

    # The first row is headers, the rest is data
    headers = raw_data[0]
    data = raw_data[1:]

    # Create DataFrame manually
    df = pd.DataFrame(data, columns=headers)

    # Drop any columns that have an empty header string
    df = df.loc[:, df.columns != '']
    # --- SAFE READ METHOD END ---
    
    return df

# --- HELPER FUNCTION 3: Budget Data Fetching ---
def get_budget_dataframe():
    """
    Connects to the NEW Budget Google Sheet.
    """
    client = get_gspread_client()
    
    # NEW URL from your screenshot (Budget Sheet)
    budget_sheet_url = 'https://docs.google.com/spreadsheets/d/1y0z3-WJrWZodXKzVcxTipmUA8zTXr8X-NmGXoUDB4Fw/edit'
    
    try:
        spreadsheet = client.open_by_url(budget_sheet_url)
        sheet = spreadsheet.sheet1 
        
        # --- SAFE READ METHOD ---
        raw_data = sheet.get_all_values()
        
        if not raw_data:
            return pd.DataFrame() 

        headers = raw_data[0]
        data = raw_data[1:]

        df = pd.DataFrame(data, columns=headers)
        df = df.loc[:, df.columns != '']
        
        return df

    except Exception as e:
        print(f"!!! ERROR ACCESSING BUDGET SHEET !!!")
        print(f"Error Details: {e}")
        return pd.DataFrame()

@app.route('/')
def home():
    """Serves the main dashboard page."""
    return render_template('dashboard.html')

@app.route('/budget')
def budget_page():
    """Serves the separate Budget page."""
    return render_template('budget.html')

@app.route('/api/data')
def get_data():
    """
    Reads raw data, applies filters, and calculates all metrics for the MAIN dashboard.
    """
    try:
        df = get_sheet_dataframe()

        id_column = 'SR. NO'
        id_col = 'NAME OF STUDENT'

        # Check if Dataframe is empty
        if df.empty:
            return jsonify({"error": "Google Sheet returned no data."}), 500

        # Clean key columns (Handle missing columns gracefully)
        if id_column in df.columns: df[id_column] = df[id_column].astype(str).str.strip()
        if id_col in df.columns: df[id_col] = df[id_col].astype(str).str.strip()
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'GENDER' in df.columns: df['GENDER'] = df['GENDER'].str.strip().str.title()
        if 'School' in df.columns: df['School'] = df['School'].str.strip()
        if 'RESULTS' in df.columns: df['RESULTS'] = df['RESULTS'].str.strip() 

        # --- CROSS-FILTERING LOGIC ---
        filter_gender = request.args.get('GENDER')
        filter_school = request.args.get('School')
        
        if filter_gender:
            df = df[df['GENDER'] == filter_gender]
        if filter_school:
            df = df[df['School'] == filter_school]
        
        # --- All calculations based on filtered DataFrame ---
        
        kpi_metrics = {
            'totalAchievements': len(df),
            'totalPoints': int(pd.to_numeric(df['POINT'], errors='coerce').sum()) if 'POINT' in df.columns and len(df) > 0 else 0,
            'uniqueSports': df['Sport'].nunique() if 'Sport' in df.columns else 0
        }
        
        # School Data
        school_data = []
        if 'School' in df.columns:
            school_counts = df['School'].value_counts().reset_index()
            school_counts.columns = ['School', 'Achievements']
            school_data = school_counts.to_dict(orient='records')

        # Gender Data
        gender_data = {'labels': [], 'series': []}
        if 'GENDER' in df.columns:
            unique_athletes = df.drop_duplicates(subset=[id_column]) if id_column in df.columns else df
            gender_counts = unique_athletes['GENDER'].value_counts().reset_index()
            gender_counts.columns = ['Gender', 'Count']
            gender_data = {
                'labels': gender_counts['Gender'].tolist(),
                'series': gender_counts['Count'].astype(int).tolist()
            }

        # Achievement Types Data (Bar Chart - Top 5)
        achievement_data_bar = []
        achievement_data_pie = {'labels': [], 'series': []}
        if 'RESULTS' in df.columns:
            df['Achievement_Type'] = df['RESULTS']
            achievement_counts = df['Achievement_Type'].value_counts().reset_index()
            achievement_counts.columns = ['Type', 'Count']
            achievement_data_bar = achievement_counts.head(5).to_dict(orient='records')
            achievement_data_pie = {
                'labels': achievement_counts['Type'].tolist(),
                'series': achievement_counts['Count'].astype(int).tolist()
            }
        
        # Popular Sports Data (Bar Chart - Top 6)
        popular_sports_data_bar = []
        sports_data_pie = {'labels': [], 'series': []}
        if 'Sport' in df.columns:
            popular_sports_counts = df.groupby('Sport')[id_column].nunique().reset_index()
            popular_sports_counts.columns = ['Sport', 'Participants']
            popular_sports_counts = popular_sports_counts.sort_values(by='Participants', ascending=False)
            popular_sports_data_bar = popular_sports_counts.head(6).to_dict(orient='records')

            sports_data_pie = {
                'labels': popular_sports_counts['Sport'].tolist(),
                'series': popular_sports_counts['Participants'].astype(int).tolist()
            }
        
        # Sport by Gender Data
        sport_by_gender_data = {'categories': [], 'series': []}
        if 'Sport' in df.columns and 'GENDER' in df.columns:
            sport_gender_pivot = df.pivot_table(index='Sport', columns='GENDER', values=id_column, aggfunc='nunique').fillna(0)
            for gender_col in ['Boys', 'Girls']:
                if gender_col not in sport_gender_pivot.columns: sport_gender_pivot[gender_col] = 0
            sport_gender_pivot['Total'] = sport_gender_pivot.get('Boys', 0) + sport_gender_pivot.get('Girls', 0)
            sport_gender_pivot = sport_gender_pivot.sort_values(by='Total', ascending=False).drop(columns=['Total']).reset_index()
            sport_by_gender_data = {
                'categories': sport_gender_pivot['Sport'].tolist(),
                'series': [
                    {'name': 'Boys', 'data': sport_gender_pivot.get('Boys', pd.Series(0, index=sport_gender_pivot.index)).astype(int).tolist()},
                    {'name': 'Girls', 'data': sport_gender_pivot.get('Girls', pd.Series(0, index=sport_gender_pivot.index)).astype(int).tolist()}
                ]
            }

        dashboard_data = {
            'kpiMetrics': kpi_metrics,
            'schoolParticipation': school_data,
            'genderDistribution': gender_data,
            'achievementTypesBar': achievement_data_bar,
            'achievementTypesPie': achievement_data_pie,
            'popularSportsBar': popular_sports_data_bar,
            'sportsPie': sports_data_pie,
            'sportByGender': sport_by_gender_data
        }
        
        return jsonify(dashboard_data)

    except Exception as e:
        error_msg = f"An error occurred: {e}"
        print("--- DETAILED ERROR ---")
        traceback.print_exc()
        print("----------------------")
        return jsonify({"error": error_msg}), 500

@app.route('/api/students_by_sport')
def get_students_by_sport():
    """Filters and returns student details for a given sport."""
    sport_name = request.args.get('sport')

    if not sport_name:
        return jsonify({"error": "Sport name is required"}), 400

    try:
        df = get_sheet_dataframe()

        # Clean columns
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'NAME OF STUDENT' in df.columns: df['NAME OF STUDENT'] = df['NAME OF STUDENT'].astype(str).str.strip()
        if 'GENDER' in df.columns: df['GENDER'] = df['GENDER'].astype(str).str.strip().str.title()
        if 'School' in df.columns: df['School'] = df['School'].astype(str).str.strip()

        filtered_df = df[df['Sport'] == sport_name].drop_duplicates(subset=['NAME OF STUDENT'])
        student_details = filtered_df[['NAME OF STUDENT', 'GENDER', 'School']]
        
        return jsonify(student_details.to_dict(orient='records'))

    except Exception as e:
        error_msg = f"An error occurred: {e}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500 

@app.route('/api/budget')
def get_budget_data():
    try:
        df = get_budget_dataframe()
        
        if df.empty:
            return jsonify({
                'categories': ['No Data'],
                'series': [
                    {'name': 'Actual Spend', 'data': [0]},
                    {'name': 'Unutilized Amount', 'data': [0]}
                ]
            })

        df.columns = df.columns.str.strip()
        required_cols = ['Description', 'Actual Spend', 'Unutilized Amount']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
             return jsonify({"error": f"Budget Sheet missing columns: {missing}"}), 500

        for col in ['Actual Spend', 'Unutilized Amount']:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(r'[^\d.]', '', regex=True), 
                errors='coerce'
            ).fillna(0)

        categories = df['Description'].astype(str).tolist()
        actual_spend = df['Actual Spend'].tolist()
        unutilized = df['Unutilized Amount'].tolist()

        return jsonify({
            'categories': categories,
            'series': [
                {'name': 'Actual Spend', 'data': actual_spend},
                {'name': 'Unutilized Amount', 'data': unutilized}
            ]
        })

    except Exception as e:
        error_msg = f"An error occurred fetching budget: {e}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500
    
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)