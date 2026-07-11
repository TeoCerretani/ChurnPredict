import pandas as pd
import numpy as np
import os
import joblib
import json
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns

def load_and_preprocess_data(filepath):
    print(f"Loading data from {filepath}...")
    
    # Read the JSON lines file
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
                
    df = pd.DataFrame(data)
    
    # Remove rows where userId is empty string (users not logged in)
    df = df[df['userId'] != '']
    
    # 30-day filter
    print("Applying 30-day filter per user...")
    thirty_days_ms = 30 * 24 * 60 * 60 * 1000
    df['user_max_ts'] = df.groupby('userId')['ts'].transform('max')
    df = df[df['ts'] >= (df['user_max_ts'] - thirty_days_ms)]
    
    # Extract features per user
    print("Extracting features...")
    
    # Target: Churn
    churn_users = df[df['page'] == 'Cancellation Confirmation']['userId'].unique()
    
    # Feature extraction
    user_features = pd.DataFrame(index=df['userId'].unique())
    user_features['churn'] = user_features.index.isin(churn_users).astype(int)
    
    # Aggregate pages
    page_counts = df.groupby(['userId', 'page']).size().unstack(fill_value=0)
    
    # We select some specific page counts as features
    feature_pages = ['NextSong', 'Thumbs Up', 'Thumbs Down', 'Add to Playlist', 'Roll Advert']
    for page in feature_pages:
        if page in page_counts.columns:
            user_features[page.lower().replace(' ', '_')] = page_counts[page]
        else:
            user_features[page.lower().replace(' ', '_')] = 0
            
    # Minutes listened
    # Length is in seconds, so length / 60 gives minutes
    length_sum = df.groupby('userId')['length'].sum() / 60
    user_features['minutes_listened'] = length_sum.fillna(0)
    
    # Skip rate calculation
    df_songs = df[df['page'] == 'NextSong'].copy()
    df_songs = df_songs.sort_values(['userId', 'ts'])
    df_songs['next_ts'] = df_songs.groupby('userId')['ts'].shift(-1)
    df_songs['listen_duration'] = (df_songs['next_ts'] - df_songs['ts']) / 1000.0
    
    # We consider a song skipped if listened duration is 5 seconds less than song length
    df_songs['is_skipped'] = (df_songs['listen_duration'] < (df_songs['length'] - 5)).astype(int)
    skip_rate_series = df_songs.groupby('userId')['is_skipped'].mean().fillna(0)
    user_features['skip_rate'] = skip_rate_series
    
    # Reset index to make userId a regular column
    user_features = user_features.reset_index().rename(columns={'index': 'userId'})
    
    return user_features

def train_and_evaluate(df):
    print("Preparing training data...")
    X = df.drop(['userId', 'churn'], axis=1)
    y = df['churn']
    
    # Train-test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    os.makedirs('ml_pipeline/outputs', exist_ok=True)
    
    # Plot before oversampling
    plt.figure(figsize=(6, 4))
    sns.countplot(x=y_train)
    plt.title('Distribuzione Classi (Prima dell\'Oversampling)')
    plt.xlabel('Churn')
    plt.ylabel('Conteggio')
    plt.savefig('ml_pipeline/outputs/dist_before.png')
    plt.close()
    
    # SMOTE oversampling for the training set
    from imblearn.over_sampling import SMOTE
    from sklearn.preprocessing import StandardScaler
    
    n_non_churn = (y_train == 0).sum()
    n_churn = (y_train == 1).sum()
    
    if n_churn > 0 and n_churn < n_non_churn:
        # Scale features for SMOTE's KNN distance metric
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        # Require at least k_neighbors=5 (default). If too few churns, lower k_neighbors
        k_neighbors = min(5, n_churn - 1)
        if k_neighbors > 0:
            smote = SMOTE(random_state=42, k_neighbors=k_neighbors)
            X_train_resampled_scaled, y_train = smote.fit_resample(X_train_scaled, y_train)
            
            # Inverse transform back to original scale for interpretable Random Forest & SHAP
            X_train = pd.DataFrame(scaler.inverse_transform(X_train_resampled_scaled), columns=X_train.columns)
        
    # Plot after oversampling
    plt.figure(figsize=(6, 4))
    sns.countplot(x=y_train)
    plt.title('Distribuzione Classi (Dopo SMOTE)')
    plt.xlabel('Churn')
    plt.ylabel('Conteggio')
    plt.savefig('ml_pipeline/outputs/dist_after.png')
    plt.close()

    # Model and Grid Search
    print("Running Grid Search on RandomForestClassifier...")
    rf = RandomForestClassifier(random_state=42)
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, None],
        'min_samples_split': [2, 5, 10]
    }
    
    # We use f1 as scoring metric since churn is typically imbalanced
    grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=3, scoring='f1', n_jobs=-1)
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"Best parameters found: {grid_search.best_params_}")
    
    # Evaluation
    print("Evaluating model...")
    y_pred = best_model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    print("\n--- Validation Results ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Not Churn', 'Churn'], yticklabels=['Not Churn', 'Churn'])
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.title('Confusion Matrix')
    
    # Save the plot
    os.makedirs('backend', exist_ok=True)
    os.makedirs('ml_pipeline/outputs', exist_ok=True)
    cm_path = 'ml_pipeline/outputs/confusion_matrix.png'
    plt.savefig(cm_path)
    plt.close()
    print(f"\nConfusion matrix saved to {cm_path}")
    
    # Feature Importance Plot
    importances = best_model.feature_importances_
    indices = np.argsort(importances)[::-1]
    plt.figure(figsize=(8, 6))
    sns.barplot(x=importances[indices], y=np.array(X.columns)[indices], orient='h')
    plt.title('Importanza delle Feature (Random Forest)')
    plt.xlabel('Importanza Relativa')
    plt.ylabel('Feature')
    plt.tight_layout()
    plt.savefig('ml_pipeline/outputs/feature_importance.png')
    plt.close()
    
    # ROC Curve Plot
    from sklearn.metrics import roc_curve, auc
    y_score = best_model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_score)
    roc_auc = auc(fpr, tpr)
    
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (area = {roc_auc:.2f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('Tasso Falsi Positivi (FPR)')
    plt.ylabel('Tasso Veri Positivi (TPR)')
    plt.title('Curva ROC')
    plt.legend(loc="lower right")
    plt.savefig('ml_pipeline/outputs/roc_curve.png')
    plt.close()
    
    # Save the model and feature columns
    model_path = 'backend/model.pkl'
    model_data = {
        'model': best_model,
        'features': list(X.columns)
    }
    joblib.dump(model_data, model_path)
    print(f"Model saved to {model_path}")
    
    return best_model, acc, prec, rec, f1

if __name__ == "__main__":
    # Ensure current working directory is the project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)
    
    data_path = 'mini_sparkify_event_data.json'
    if not os.path.exists(data_path):
        print(f"Error: Data file {data_path} not found in {base_dir}!")
        exit(1)
        
    df_features = load_and_preprocess_data(data_path)
    print(f"\nExtracted features for {len(df_features)} users.")
    print("Feature sample:")
    print(df_features.head())
    
    print("\nStarting training phase...")
    train_and_evaluate(df_features)
    print("\nPipeline completed successfully.")
