from flask import Flask, jsonify, render_template, request
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import traceback
import os
import json

app = Flask(__name__)

# --- AUTHENTICATION ---
def get_gspread_client():
    scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
    creds_json_str = os.environ.get('GCP_CREDS')
    if creds_json_str:
        creds_dict = json.loads(creds_json_str)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    else:
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds)

# --- HELPER: GENERIC SHEET FETCHER ---
def get_dataframe_by_sheet_name(sheet_name_or_index):
    """Fetches data from a specific sheet tab (Name or Index)."""
    client = get_gspread_client()
    sheet_url = 'https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit?gid=0#gid=0'
    try:
        spreadsheet = client.open_by_url(sheet_url)
        if isinstance(sheet_name_or_index, int):
            sheet = spreadsheet.get_worksheet(sheet_name_or_index)
        else:
            sheet = spreadsheet.worksheet(sheet_name_or_index)
        
        raw = sheet.get_all_values()
        if not raw: return pd.DataFrame()
        return pd.DataFrame(raw[1:], columns=raw[0])
    except Exception as e:
        print(f"Error fetching sheet '{sheet_name_or_index}': {e}")
        return pd.DataFrame()

# --- HELPER: COLUMN NORMALIZER ---
def normalize_columns(df):
    """Standardizes column names for the Staff Summit logic."""
    df.columns = df.columns.str.strip()
    new_cols = {}
    for col in df.columns:
        c_lower = col.lower()
        if 'name' in c_lower and 'student' in c_lower: new_cols[col] = 'Name'
        elif 'name' in c_lower: new_cols[col] = 'Name'
        elif 'department' in c_lower or 'school' in c_lower or 'dept' in c_lower: new_cols[col] = 'Department'
        elif 'gender' in c_lower or 'sex' in c_lower: new_cols[col] = 'Gender'
        elif 'sport' in c_lower or 'game' in c_lower: new_cols[col] = 'Sport'
        elif 'point' in c_lower: new_cols[col] = 'Points'
        elif 'sr' in c_lower and 'no' in c_lower: new_cols[col] = 'SR. NO'
        elif 'event' in c_lower or 'category' in c_lower: new_cols[col] = 'Event'
        
    df = df.rename(columns=new_cols)
    return df

# --- EXISTING HELPERS (Unchanged) ---
def get_sheet_dataframe():
    return get_dataframe_by_sheet_name(0)

def get_budget_dataframe():
    client = get_gspread_client()
    url = 'https://docs.google.com/spreadsheets/d/1y0z3-WJrWZodXKzVcxTipmUA8zTXr8X-NmGXoUDB4Fw/edit'
    try:
        spreadsheet = client.open_by_url(url)
        sheet = spreadsheet.sheet1 
        raw = sheet.get_all_values()
        if not raw: return pd.DataFrame()
        return pd.DataFrame(raw[1:], columns=raw[0])
    except: return pd.DataFrame()

def get_operations_dataframe():
    client = get_gspread_client()
    url = 'https://docs.google.com/spreadsheets/d/1y0z3-WJrWZodXKzVcxTipmUA8zTXr8X-NmGXoUDB4Fw/edit'
    try:
        spreadsheet = client.open_by_url(url)
        sheet = spreadsheet.worksheet('Sheet2')
        raw = sheet.get_all_values()
        if not raw: return pd.DataFrame()
        return pd.DataFrame(raw[1:], columns=raw[0])
    except Exception as e:
        print(f"Error accessing Sheet2: {e}")
        return pd.DataFrame()

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/achievements')
def achievements_page():
    return render_template('dashboard.html')
@app.route('/budget')
def budget_page(): return render_template('budget.html')

@app.route('/operations')
def operations_page(): return render_template('operations.html')

@app.route('/staff-summit')
def staff_summit_page(): return render_template('staff.html')


# --- MAIN DASHBOARD API (Unchanged) ---
@app.route('/api/data')
def get_data():
    try:
        df = get_sheet_dataframe()
        if df.empty: return jsonify({"error": "No data"}), 500
        
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'GENDER' in df.columns: df['GENDER'] = df['GENDER'].astype(str).str.strip().str.title()
        if 'RESULTS' in df.columns: df['RESULTS'] = df['RESULTS'].astype(str).str.strip()
        
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
            s_c = df['School'].value_counts().reset_index()
            s_c.columns = ['School', 'Achievements']
            school_data = s_c.to_dict(orient='records')

        gender_data = {'labels': [], 'series': []}
        if 'GENDER' in df.columns:
            uniq = df.drop_duplicates(subset=['SR. NO']) if 'SR. NO' in df.columns else df
            g_c = uniq['GENDER'].value_counts().reset_index()
            gender_data = {'labels': g_c['GENDER'].tolist(), 'series': g_c['count'].astype(int).tolist()}

        a_bar = []
        a_pie = {'labels': [], 'series': []}
        if 'RESULTS' in df.columns:
            c = df['RESULTS'].value_counts().reset_index()
            c.columns = ['Type', 'Count']
            a_bar = c.head(5).to_dict(orient='records')
            a_pie = {'labels': c['Type'].tolist(), 'series': c['Count'].astype(int).tolist()}

        s_pie = {'labels': [], 'series': []}
        pop_sports = []
        if 'Sport' in df.columns:
            s_c = df.groupby('Sport')['SR. NO'].nunique().reset_index().sort_values(by='SR. NO', ascending=False)
            s_pie = {'labels': s_c['Sport'].tolist(), 'series': s_c['SR. NO'].astype(int).tolist()}
            pop_sports = s_c.head(6).rename(columns={'SR. NO': 'Participants'}).to_dict(orient='records')

        sb_gen = {'categories': [], 'series': []}
        if 'Sport' in df.columns and 'GENDER' in df.columns:
            p = df.pivot_table(index='Sport', columns='GENDER', values='SR. NO', aggfunc='nunique').fillna(0)
            p['Total'] = p.sum(axis=1)
            p = p.sort_values('Total', ascending=False).drop(columns=['Total'])
            sb_gen = {
                'categories': p.index.tolist(),
                'series': [{'name': c, 'data': p[c].astype(int).tolist()} for c in p.columns]
            }

        return jsonify({
            'kpiMetrics': kpi_metrics, 'schoolParticipation': school_data, 'genderDistribution': gender_data,
            'achievementTypesBar': a_bar, 'achievementTypesPie': a_pie,
            'popularSportsBar': pop_sports, 'sportsPie': s_pie, 'sportByGender': sb_gen
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/students_by_sport')
def get_students_by_sport():
    try:
        sport = request.args.get('sport')
        df = get_sheet_dataframe()
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        filtered = df[df['Sport'] == sport].drop_duplicates(subset=['NAME OF STUDENT'])
        return jsonify(filtered[['NAME OF STUDENT', 'GENDER', 'School']].to_dict(orient='records'))
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/budget')
def get_budget_data():
    try:
        df = get_budget_dataframe()
        if df.empty: return jsonify({'categories': [], 'series': []})
        df.columns = df.columns.str.strip()
        required = ['Description', 'Actual Spend', 'Unutilized Amount']
        if not all(col in df.columns for col in required): return jsonify({"error": "Missing Cols"}), 500
        for col in ['Actual Spend', 'Unutilized Amount']:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(r'[^\d.]', '', regex=True), errors='coerce').fillna(0)
        return jsonify({
            'categories': df['Description'].tolist(),
            'series': [{'name': 'Actual Spend', 'data': df['Actual Spend'].tolist()}, {'name': 'Unutilized Amount', 'data': df['Unutilized Amount'].tolist()}]
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/operations/months')
def get_operations_months():
    try:
        df = get_operations_dataframe()
        if df.empty: return jsonify([])
        df.columns = df.columns.str.strip()
        if 'Month' not in df.columns: return jsonify(["Month Column Missing"])
        months = df['Month'].dropna().unique().tolist()
        return jsonify(months)
    except: return jsonify([])

@app.route('/api/operations')
def get_operations_data():
    try:
        df = get_operations_dataframe()
        if df.empty: return jsonify({'facilities': [], 'used': [], 'unused': []})
        df.columns = df.columns.str.strip()
        
        selected_month = request.args.get('month')
        if selected_month and 'Month' in df.columns:
            df = df[df['Month'] == selected_month]
        
        required = ['Games', 'utilized', 'Capacity_month']
        if not all(col in df.columns for col in required): return jsonify({"error": "Missing Columns in Sheet2"}), 500
        
        for col in ['utilized', 'Capacity_month', 'Training Session by Staff', 'Training Session by Student']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col].astype(str).str.replace('%', '').str.replace(',', ''), errors='coerce').fillna(0)

        df['unused'] = df['Capacity_month'] - df['utilized']
        df['unused'] = df['unused'].apply(lambda x: max(x, 0))

        return jsonify({
            'facilities': df['Games'].tolist(),
            'used': df['utilized'].tolist(),
            'unused': df['unused'].tolist(),
            'training_staff': df['Training Session by Staff'].tolist() if 'Training Session by Staff' in df.columns else [],
            'training_student': df['Training Session by Student'].tolist() if 'Training Session by Student' in df.columns else []
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

# --- STAFF SUMMIT API (UPDATED with DEPT POINTS) ---
@app.route('/api/staff_data')
def get_staff_data():
    try:
        df = get_dataframe_by_sheet_name('Staff Summit')

        if df.empty: return jsonify({"error": "No data in Staff Summit sheet"}), 500
        
        df = normalize_columns(df)
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'Gender' in df.columns: df['Gender'] = df['Gender'].astype(str).str.strip().str.title()

        kpi = {
            'totalAchievements': len(df),
            'totalPoints': int(pd.to_numeric(df['Points'], errors='coerce').sum()) if 'Points' in df.columns else 0
        }

        # Gender Donut
        id_col = 'SR. NO' if 'SR. NO' in df.columns else 'Name'
        unique_p = df.drop_duplicates(subset=[id_col])
        g_counts = unique_p['Gender'].value_counts().reset_index()
        gender_data = {
            'labels': g_counts['Gender'].tolist(),
            'series': g_counts['count'].astype(int).tolist()
        }

        # 1. Department Bar (Achievements Count - Top 10)
        dept_data = {'categories': [], 'series': []}
        if 'Department' in df.columns:
            d_counts = df['Department'].value_counts().reset_index()
            d_counts = d_counts.head(10)
            dept_data = {
                'categories': d_counts['Department'].tolist(),
                'series': d_counts['count'].tolist()
            }

        # 2. Department Bar (Total Points - Top 10) - NEW!
        dept_points_data = {'categories': [], 'series': []}
        if 'Department' in df.columns and 'Points' in df.columns:
            df['Points'] = pd.to_numeric(df['Points'], errors='coerce').fillna(0)
            d_points = df.groupby('Department')['Points'].sum().reset_index()
            d_points = d_points.sort_values(by='Points', ascending=False).head(10)
            
            dept_points_data = {
                'categories': d_points['Department'].tolist(),
                'series': d_points['Points'].tolist()
            }

        # Sports Pie
        sports_data = {'labels': [], 'series': []}
        if 'Sport' in df.columns:
            s_counts = df['Sport'].value_counts().reset_index()
            sports_data = {
                'labels': s_counts['Sport'].tolist(),
                'series': s_counts['count'].tolist()
            }

        return jsonify({
            'kpi': kpi, 
            'gender': gender_data, 
            'department': dept_data, 
            'department_points': dept_points_data, # New Data
            'sports': sports_data
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- DRILLDOWN API (10 OR 5 POINTS + EVENT + GENDER) ---
@app.route('/api/winners_by_sport')
def get_winners():
    try:
        sport = request.args.get('sport')
        df = get_dataframe_by_sheet_name('Staff Summit')
        
        if df.empty: return jsonify([])

        df = normalize_columns(df)
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        
        # 1. Filter by Sport
        filtered = df[df['Sport'] == sport]

        # 2. Filter by Points (10 OR 5)
        if 'Points' in filtered.columns:
            filtered = filtered[pd.to_numeric(filtered['Points'], errors='coerce').isin([10, 5])]
            filtered = filtered.sort_values(by='Points', ascending=False)

        # 3. Select columns
        cols_to_keep = ['Name', 'Department', 'Points']
        if 'Event' in filtered.columns: cols_to_keep.append('Event')
        if 'Gender' in filtered.columns: cols_to_keep.append('Gender')
        
        final_cols = [c for c in cols_to_keep if c in filtered.columns]

        return jsonify(filtered[final_cols].to_dict(orient='records'))

    except Exception as e: 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)