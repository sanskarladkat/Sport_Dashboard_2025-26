# Add 'request' to handle URL parameters
from flask import Flask, jsonify, render_template, request
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import traceback
import os
import json

app = Flask(__name__)

# --- HELPER 1: Authentication ---
def get_gspread_client():
    scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
    creds_json_str = os.environ.get('GCP_CREDS')
    if creds_json_str:
        creds_dict = json.loads(creds_json_str)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    else:
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds)

# --- HELPER 2: Student Data (Main Sheet) ---
def get_sheet_dataframe():
    client = get_gspread_client()
    sheet_url = 'https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit?gid=0#gid=0'
    spreadsheet = client.open_by_url(sheet_url)
    sheet = spreadsheet.sheet1
    
    raw_data = sheet.get_all_values()
    if not raw_data: return pd.DataFrame()
    
    headers = raw_data[0]
    data = raw_data[1:]
    df = pd.DataFrame(data, columns=headers)
    
    # FIX: Clean Column Names immediately
    df.columns = df.columns.str.strip()
    df = df.loc[:, df.columns != '']
    return df

# --- HELPER 3: Budget Data (Sheet1) ---
def get_budget_dataframe():
    client = get_gspread_client()
    budget_sheet_url = 'https://docs.google.com/spreadsheets/d/1y0z3-WJrWZodXKzVcxTipmUA8zTXr8X-NmGXoUDB4Fw/edit'
    
    try:
        spreadsheet = client.open_by_url(budget_sheet_url)
        sheet = spreadsheet.sheet1 
        
        raw_data = sheet.get_all_values()
        if not raw_data: return pd.DataFrame()
        
        headers = raw_data[0]
        data = raw_data[1:]
        df = pd.DataFrame(data, columns=headers)
        df.columns = df.columns.str.strip() # Clean headers
        df = df.loc[:, df.columns != '']
        return df
    except Exception as e:
        print(f"Error accessing Budget Sheet: {e}")
        return pd.DataFrame()

# --- HELPER 4: Operations Data (Sheet2) ---
def get_operations_dataframe():
    client = get_gspread_client()
    budget_sheet_url = 'https://docs.google.com/spreadsheets/d/1y0z3-WJrWZodXKzVcxTipmUA8zTXr8X-NmGXoUDB4Fw/edit'
    
    try:
        spreadsheet = client.open_by_url(budget_sheet_url)
        sheet = spreadsheet.worksheet('Sheet2')
        
        raw_data = sheet.get_all_values()
        if not raw_data: return pd.DataFrame()

        headers = raw_data[0]
        data = raw_data[1:]
        df = pd.DataFrame(data, columns=headers)
        df.columns = df.columns.str.strip() # Clean headers
        return df
    except Exception as e:
        print(f"Error accessing Sheet2 (Operations): {e}")
        return pd.DataFrame()

# --- ROUTES ---
@app.route('/')
def home():
    return render_template('dashboard.html')

@app.route('/budget')
def budget_page():
    return render_template('budget.html')

@app.route('/operations')
def operations_page():
    return render_template('operations.html')

@app.route('/api/data')
def get_data():
    try:
        df = get_sheet_dataframe()
        if df.empty: return jsonify({"error": "No data"}), 500
        
        # Data Cleaning
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'GENDER' in df.columns: df['GENDER'] = df['GENDER'].astype(str).str.strip().str.title()
        if 'RESULTS' in df.columns: df['RESULTS'] = df['RESULTS'].astype(str).str.strip() # Ensure results are clean
        
        filter_gender = request.args.get('GENDER')
        filter_school = request.args.get('School')
        if filter_gender: df = df[df['GENDER'] == filter_gender]
        if filter_school: df = df[df['School'] == filter_school]

        kpi_metrics = {
            'totalAchievements': len(df),
            'totalPoints': int(pd.to_numeric(df['POINT'], errors='coerce').sum()) if 'POINT' in df.columns else 0,
            'uniqueSports': df['Sport'].nunique() if 'Sport' in df.columns else 0
        }

        school_data = []
        if 'School' in df.columns:
            school_counts = df['School'].value_counts().reset_index()
            school_counts.columns = ['School', 'Achievements']
            school_data = school_counts.to_dict(orient='records')

        gender_data = {'labels': [], 'series': []}
        if 'GENDER' in df.columns:
            unique = df.drop_duplicates(subset=['SR. NO']) if 'SR. NO' in df.columns else df
            g_counts = unique['GENDER'].value_counts().reset_index()
            gender_data = {'labels': g_counts['GENDER'].tolist(), 'series': g_counts['count'].astype(int).tolist()}

        # --- ACHIEVEMENTS LEVEL CHART LOGIC ---
        a_data_bar = []
        a_data_pie = {'labels': [], 'series': []}
        
        # Check for 'RESULTS' column (Case sensitive, but we stripped spaces above)
        if 'RESULTS' in df.columns:
            df['Achievement_Type'] = df['RESULTS']
            c = df['Achievement_Type'].value_counts().reset_index()
            c.columns = ['Type', 'Count'] # Rename for frontend consistency
            a_data_bar = c.head(5).to_dict(orient='records')
            a_data_pie = {'labels': c['Type'].tolist(), 'series': c['Count'].astype(int).tolist()}
        else:
            print("WARNING: 'RESULTS' column not found in Main Sheet. Charts will be empty.")

        s_data_pie = {'labels': [], 'series': []}
        pop_sports = []
        if 'Sport' in df.columns:
            s_counts = df.groupby('Sport')['SR. NO'].nunique().reset_index().sort_values(by='SR. NO', ascending=False)
            s_data_pie = {'labels': s_counts['Sport'].tolist(), 'series': s_counts['SR. NO'].astype(int).tolist()}
            pop_sports = s_counts.head(6).rename(columns={'SR. NO': 'Participants'}).to_dict(orient='records')

        sb_gender = {'categories': [], 'series': []}
        if 'Sport' in df.columns and 'GENDER' in df.columns:
            p = df.pivot_table(index='Sport', columns='GENDER', values='SR. NO', aggfunc='nunique').fillna(0)
            p['Total'] = p.sum(axis=1)
            p = p.sort_values('Total', ascending=False).drop(columns=['Total'])
            sb_gender = {
                'categories': p.index.tolist(),
                'series': [{'name': c, 'data': p[c].astype(int).tolist()} for c in p.columns]
            }

        return jsonify({
            'kpiMetrics': kpi_metrics, 'schoolParticipation': school_data, 'genderDistribution': gender_data,
            'achievementTypesBar': a_data_bar, 'achievementTypesPie': a_data_pie,
            'popularSportsBar': pop_sports, 'sportsPie': s_data_pie, 'sportByGender': sb_gender
        })

    except Exception as e:
        print(f"Main Data API Error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/students_by_sport')
def get_students_by_sport():
    try:
        sport = request.args.get('sport')
        df = get_sheet_dataframe()
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        filtered = df[df['Sport'] == sport].drop_duplicates(subset=['NAME OF STUDENT'])
        return jsonify(filtered[['NAME OF STUDENT', 'GENDER', 'School']].to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/budget')
def get_budget_data():
    try:
        df = get_budget_dataframe()
        if df.empty: return jsonify({'categories': [], 'series': []})

        required = ['Description', 'Actual Spend', 'Unutilized Amount']
        if not all(col in df.columns for col in required):
            return jsonify({"error": f"Budget Sheet missing columns. Needed: {required}"}), 500

        for col in ['Actual Spend', 'Unutilized Amount']:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(r'[^\d.]', '', regex=True), errors='coerce').fillna(0)

        return jsonify({
            'categories': df['Description'].tolist(),
            'series': [{'name': 'Actual Spend', 'data': df['Actual Spend'].tolist()}, {'name': 'Unutilized Amount', 'data': df['Unutilized Amount'].tolist()}]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/operations')
def get_operations_data():
    try:
        df = get_operations_dataframe()
        if df.empty: return jsonify({'facilities': [], 'used': [], 'unused': []})
        
        required_cols = ['Games', 'utilized', 'Capacity_month']
        missing = [col for col in required_cols if col not in df.columns]
        if missing: return jsonify({"error": f"Sheet2 missing columns: {missing}"}), 500
        
        for col in ['utilized', 'Capacity_month']:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace('%', '').str.replace(',', ''), errors='coerce').fillna(0)

        df['unused'] = df['Capacity_month'] - df['utilized']
        df['unused'] = df['unused'].apply(lambda x: max(x, 0))

        return jsonify({
            'facilities': df['Games'].tolist(),
            'used': df['utilized'].tolist(),
            'unused': df['unused'].tolist()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)