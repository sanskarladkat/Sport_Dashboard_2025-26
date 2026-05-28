from flask import Flask, jsonify, render_template, request, send_file
from flask_caching import Cache
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import traceback
import os
import json
import io
import matplotlib
matplotlib.use('Agg') 
import matplotlib.pyplot as plt
from datetime import datetime

app = Flask(__name__)
cache = Cache(app, config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300})

def get_gspread_client():
    scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
    creds_json_str = os.environ.get('GCP_CREDS')
    if creds_json_str:
        creds_dict = json.loads(creds_json_str)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    else:
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    return gspread.authorize(creds)

def get_dataframe_by_sheet_name(sheet_name_or_index):
    client = get_gspread_client()
    sheet_url = 'https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit'
    try:
        spreadsheet = client.open_by_url(sheet_url)
        sheet = spreadsheet.get_worksheet(sheet_name_or_index) if isinstance(sheet_name_or_index, int) else spreadsheet.worksheet(sheet_name_or_index)
        raw = sheet.get_all_values()
        if not raw: return pd.DataFrame()
        return pd.DataFrame(raw[1:], columns=raw[0])
    except Exception as e:
        print(f"!!! Error fetching sheet '{sheet_name_or_index}': {e}")
        return pd.DataFrame()

def normalize_columns(df):
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
        elif 'rank' in c_lower: new_cols[col] = 'Rank'
        elif 'participant' in c_lower: new_cols[col] = 'Participants'
    return df.rename(columns=new_cols)

#LANDING PAGE
@app.route('/')
def index():
    image_folder = os.path.join('static', 'images')
    exts = ('.jpg', '.jpeg', '.png', '.JPG', '.PNG', '.JPEG')
    images = []
    if os.path.exists(image_folder):
        images = [f for f in os.listdir(image_folder) if f.endswith(exts)]
    return render_template('index.html', winner_images=images)

# ACHIEVEMENTS 
@app.route('/achievements')
def achievements_page(): 
    return render_template('dashboard.html')
def achievements_page(): 
    return render_template('dashboard.html')

@app.route('/api/data')
@cache.cached(timeout=300, query_string=True) 
def get_data():
    try:
        # Allow selecting a sheet via query param `sheet` (default to Achievement_2025-26)
        sheet_param = request.args.get('sheet', 'Achievement_2025-26')
        df = get_dataframe_by_sheet_name(sheet_param)
        if df.empty: return jsonify({"error": "No data"}), 500
        
        if 'Sport' in df.columns: df['Sport'] = df['Sport'].str.strip().str.title()
        if 'POINT' in df.columns: df['POINT'] = pd.to_numeric(df['POINT'], errors='coerce').fillna(0)
        if 'GENDER' in df.columns: df['GENDER'] = df['GENDER'].astype(str).str.strip().str.title()
        if 'RESULTS' in df.columns: df['RESULTS'] = df['RESULTS'].astype(str).str.strip()

        kpi_metrics = {
            'totalAchievements': len(df),
            'totalPoints': int(df['POINT'].sum()),
            'uniqueSports': df['Sport'].nunique() if 'Sport' in df.columns else 0
        }
        
        school_points = df.groupby('School')['POINT'].sum().reset_index().sort_values(by='POINT', ascending=False)
        school_participation = df['School'].value_counts().reset_index().rename(columns={'count': 'Achievements'})

        # Gender Logic (Unique Athletes)
        uniq_athletes = df.drop_duplicates(subset=['SR. NO']) if 'SR. NO' in df.columns else df
        gender_counts = uniq_athletes['GENDER'].value_counts().reset_index()

        results_counts = df['RESULTS'].value_counts().reset_index()

        return jsonify({
            'kpiMetrics': kpi_metrics, 
            'schoolParticipation': school_participation.to_dict(orient='records'), 
            'schoolPoints': school_points.rename(columns={'POINT':'Points'}).to_dict(orient='records'),
            'genderDistribution': {'labels': gender_counts['GENDER'].tolist(), 'series': gender_counts['count'].tolist()},
            'achievementTypesPie': {'labels': results_counts['RESULTS'].tolist(), 'series': results_counts['count'].tolist()},
            'sportsPie': {'labels': df['Sport'].value_counts().index.tolist(), 'series': df['Sport'].value_counts().values.tolist()}
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/participants_by_school')
def get_participants_by_school():
    school_name = request.args.get('school')
    sport_name = request.args.get('sport')
    try:
        df = get_dataframe_by_sheet_name(0) 
        if school_name and school_name != 'all':
            df = df[df['School'] == school_name]
            
        if sport_name and sport_name != 'all':
            df = df[df['Sport'].str.strip().str.title() == sport_name.strip().title()]
            
        result = df[['NAME OF STUDENT', 'School', 'RESULTS', 'Sport', 'VENUE', 'Rank']].drop_duplicates()
        return jsonify(result.to_dict(orient='records'))
    except Exception as e: return jsonify({"error": str(e)}), 500

# BUDGET
@app.route('/budget')
def budget_page(): 
    return render_template('budget.html')

@app.route('/api/budget')
def get_budget_data():
    try:
        sheet_param = request.args.get('sheet', 'budget_2025-26')
        print(f"[BUDGET API] Fetching sheet: {sheet_param}")
        client = get_gspread_client()
        url = 'https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit'
        spreadsheet = client.open_by_url(url)
        
        try:
            sheet = spreadsheet.worksheet(sheet_param)
        except Exception:
            print(f"Sheet '{sheet_param}' not found, using sheet1 as fallback")
            sheet = spreadsheet.sheet1
        
        df = pd.DataFrame(sheet.get_all_records())
        
        if df.empty:
            return jsonify({"error": "No data in sheet", "sheet": sheet_param}), 400
            
        # Standardize column headers to avoid runtime KeyErrors due to casing differences
        df.columns = df.columns.str.strip()
        
        # Safe structural type conversion logic handling strings, currency markers, and "nan" strings safely
        for col in ['Actual Spend', 'Unutilized Amount']:
            if col in df.columns:
                # Replace literal nan strings with zero before applying character stripping regex
                cleaned_series = df[col].astype(str).str.replace('nan', '0', case=False)
                cleaned_series = cleaned_series.str.replace(r'[^\d.]', '', regex=True)
                df[col] = pd.to_numeric(cleaned_series, errors='coerce').fillna(0)
            else:
                # Create the series matching structural design if missing in source
                df[col] = 0.0

        # Description header validation checks
        desc_col = 'Description' if 'Description' in df.columns else df.columns[0]
        
        result = {
            'sheet': sheet_param,
            'categories': df[desc_col].astype(str).tolist(),
            'series': [
                {'name': 'Actual Spend', 'data': df['Actual Spend'].tolist()}, 
                {'name': 'Unutilized Amount', 'data': df['Unutilized Amount'].tolist()}
            ]
        }
        print(f"[BUDGET API] Returning {len(result['categories'])} rows from sheet {sheet_param}")
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_budget_data: {e}")
        return jsonify({"error": str(e)}), 500

# FACILITY
@app.route('/operations')
def operations_page(): 
    return render_template('operations.html')

@app.route('/api/operations/months')
def get_ops_months():
    try:
        sheet_param = request.args.get('sheet', 'Facility_2025-26')
        print(f"[OPS MONTHS] Fetching months from sheet: {sheet_param}")
        client = get_gspread_client()
        ss = client.open_by_url('https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit')
        try:
            sheet = ss.worksheet(sheet_param)
        except Exception:
            print(f"Sheet '{sheet_param}' not found, using sheet1 as fallback")
            sheet = ss.sheet1
        df = pd.DataFrame(sheet.get_all_records())
        months = df['Month'].dropna().unique().tolist() if 'Month' in df.columns else []
        months_sorted = sorted(months, key=lambda x: str(x))
        print(f"[OPS MONTHS] Found {len(months_sorted)} months")
        return jsonify(months_sorted)
    except Exception as e:
        print(f"Error in get_ops_months: {e}")
        return jsonify([])

@app.route('/api/operations')
def get_ops_data():
    month = request.args.get('month')
    yearly = request.args.get('yearly')
    sheet_param = request.args.get('sheet', 'Facility_2025-26')
    print(f"[OPS API] Fetching from sheet: {sheet_param}, month: {month}, yearly: {yearly}")
    try:
        client = get_gspread_client()
        ss = client.open_by_url('https://docs.google.com/spreadsheets/d/1YiXrlu6qxtorsoDThvB62HTVSuWE9BhQ9J-pbFH6dGc/edit')
        try:
            sheet = ss.worksheet(sheet_param)
        except Exception:
            print(f"Sheet '{sheet_param}' not found, using sheet1 as fallback")
            sheet = ss.sheet1
        df = pd.DataFrame(sheet.get_all_records())
        if month and not yearly:
            df = df[df['Month'] == month]

        # Normalize numeric columns
        for col in ['utilized', 'Capacity_month']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col].astype(str).str.replace('%','').str.replace(',',''), errors='coerce').fillna(0)
            else:
                df[col] = 0

        # Aggregate by Games to produce totals per facility (handles multiple months)
        if 'Games' in df.columns:
            grouped = df.groupby('Games', as_index=False).agg({
                'Capacity_month': 'sum',
                'utilized': 'sum'
            })
            grouped['unused'] = (grouped['Capacity_month'] - grouped['utilized']).clip(lower=0)
            facilities = grouped['Games'].tolist()
            used = grouped['utilized'].tolist()
            unused = grouped['unused'].tolist()
        else:
            # Fallback if Games column missing
            df['unused'] = (df['Capacity_month'] - df['utilized']).clip(lower=0)
            facilities = df.index.astype(str).tolist()
            used = df['utilized'].tolist()
            unused = df['unused'].tolist()

        # KPI metrics (total capacity and utilized across current filter/year)
        total_capacity = float(df['Capacity_month'].sum())
        total_utilized = float(df['utilized'].sum())
        total_sports = int(df['Games'].nunique()) if 'Games' in df.columns else 0

        return jsonify({
            'facilities': facilities,
            'used': used,
            'unused': unused,
            'kpis': {
                'total_capacity': total_capacity,
                'total_utilized': total_utilized,
                'total_sports': total_sports
            }
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

#STAFF SUMMIT
@app.route('/staff-summit')
def staff_summit_page(): 
    return render_template('staff.html')

@app.route('/api/staff_data')
@cache.cached(timeout=300, query_string=True)
def get_staff_data():
    try:
        sheet_param = request.args.get('sheet', 'Staff_Summit_2025-26')
        print(f"[STAFF] Fetching Staff Summit data from sheet: {sheet_param}")
        df = normalize_columns(get_dataframe_by_sheet_name(sheet_param))
        print(f"[STAFF] Data shape: {df.shape}, Empty: {df.empty}")
        
        if df.empty:
            print("[STAFF] WARNING: DataFrame is empty!")
            return jsonify({"error": "No data found in Staff Summit sheet"}), 500
        
        df['Points'] = pd.to_numeric(df['Points'], errors='coerce').fillna(0)
        df['Participants'] = pd.to_numeric(df['Participants'], errors='coerce').fillna(0)
        
        kpi = {
            'totalAchievements': len(df), 
            'totalPoints': int(df['Points'].sum()),
            'totalParticipants': int(df['Participants'].sum()),
            'totalSports': df['Sport'].nunique()
        }
        
        gender = df.drop_duplicates(subset=['Name'])['Gender'].value_counts().to_dict()
        dept_part = df.groupby('Department')['Participants'].sum().sort_values(ascending=False).head(25)
        dept_pts = df.groupby('Department')['Points'].sum().sort_values(ascending=False).head(25)
        sports = df['Sport'].value_counts().to_dict()
        
        print(f"[STAFF] KPI calculated: {kpi['totalAchievements']} records")
        return jsonify({
            'kpi': kpi, 
            'gender': {'labels': list(gender.keys()), 'series': list(gender.values())},
            'department': {'categories': dept_part.index.tolist(), 'series': dept_part.values.tolist()},
            'department_points': {'categories': dept_pts.index.tolist(), 'series': dept_pts.values.tolist()},
            'sports': {'labels': list(sports.keys()), 'series': list(sports.values())}
        })
    except Exception as e:
        print(f"[STAFF] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e), "type": type(e).__name__}), 500

@app.route('/api/winners_by_sport')
@cache.cached(timeout=300, query_string=True)
def get_staff_winners():
    sport = request.args.get('sport')
    sheet_param = request.args.get('sheet', 'Staff_Summit_2025-26')
    try:
        sport_label = sport if sport else 'All'
        print(f"[WINNERS] Fetching winners for sheet: {sheet_param}, sport: {sport_label}")
        df = normalize_columns(get_dataframe_by_sheet_name(sheet_param))
        if df.empty:
            print("[WINNERS] WARNING: DataFrame is empty!")
            return jsonify([])
        df['Points'] = pd.to_numeric(df['Points'], errors='coerce').fillna(0)
        if not sport or sport == 'All':
            filtered = df[df['Points'].isin([10, 7, 5])].sort_values(by='Points', ascending=False)
        else:
            filtered = df[(df['Sport'] == sport) & (df['Points'].isin([10, 7, 5]))].sort_values(by='Points', ascending=False)
        print(f"[WINNERS] Found {len(filtered)} winners for {sport_label}")
        return jsonify(filtered.to_dict(orient='records'))
    except Exception as e:
        print(f"[WINNERS] ERROR: {str(e)}")
        return jsonify([])

# INTER-DEPARTMENT
@app.route('/inter_department')
def inter_department_page():
    return render_template('inter_department.html')

@app.route('/api/inter_department_data')
def get_inter_dept_data():
    try:
        # Accept explicit runtime target sheet identifiers over URL parameters
        sheet_param = request.args.get('sheet', 'Inter_department_2025-26')
        df = get_dataframe_by_sheet_name(sheet_param)
        
        if df.empty:
            return jsonify({"error": "No data found for the selected sheet"}), 404
            
        df['POINT'] = pd.to_numeric(df['POINT'], errors='coerce').fillna(0)
        df['Participants'] = pd.to_numeric(df['Participants'], errors='coerce').fillna(0)
        
        kpi = {'totalPoints': int(df['POINT'].sum()), 'uniqueSports': df['Sport'].nunique(), 'totalParticipants': int(df['Participants'].sum())}
        s_part = df.groupby('School')['Participants'].sum().sort_values(ascending=False).reset_index()
        s_pts = df.groupby('School')['POINT'].sum().sort_values(ascending=False).reset_index()
        s_grp = df.groupby('Sport')['Participants'].sum().reset_index()
        
        return jsonify({
            'kpiMetrics': kpi, 
            'schoolParticipants': s_part.to_dict(orient='records'),
            'schoolPoints': s_pts.rename(columns={'POINT':'Points'}).to_dict(orient='records'),
            'sportsParticipated': {'labels': s_grp['Sport'].tolist(), 'series': s_grp['Participants'].tolist()}
        })
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

@app.route('/api/inter_dept_participants')
def get_inter_dept_list():
    l_type = request.args.get('type') 
    sheet_param = request.args.get('sheet', 'Inter_department_2025-26')
    try:
        # Dynamically pulls data based on the requested academic sheet context parameter 
        df = get_dataframe_by_sheet_name(sheet_param)
        
        if df.empty:
            return jsonify([])
            
        if l_type in ['1st', '2nd', '3rd']:
            df = df[df['RESULTS'].astype(str).str.contains(l_type, case=False)]
            
        return jsonify(df[['NAME OF STUDENT', 'School', 'Sport', 'RESULTS', 'Event', 'Rank']].to_dict(orient='records'))
    except Exception as e: 
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')