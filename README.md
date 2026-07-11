# 🔮 ChurnPredict: User Retention Forecaster

Un sistema intelligente end-to-end progettato per identificare e prevedere l'abbandono degli utenti (churn) su una piattaforma di streaming musicale. Il sistema analizza i log degli eventi utente, estrae le feature comportamentali tramite una pipeline di Machine Learning e fornisce previsioni in tempo reale attraverso una moderna interfaccia web.


---

## 🏗️ Struttura del Progetto

Il workflow dell'applicazione è diviso in tre macro-componenti principali:

1. **Pipeline Dati (ML Pipeline):** Estrazione dei dati dal file `mini_sparkify_event_data.json`, pulizia, aggregazione per utente e ingegnerizzazione delle feature (minuti ascoltati, skip rate, interazioni con le varie pagine).
2. **Core Predittivo (Backend):** Un server **FastAPI** che espone gli endpoint RESTful per l'inferenza. Carica in memoria il modello addestrato e valuta le probabilità di abbandono sulla base delle statistiche dell'utente.
3. **Interfaccia Utente (Frontend):** Una dashboard interattiva basata su **Next.js** e React che permette di visualizzare i profili, testare le previsioni di churn in tempo reale e analizzare i risultati visivamente.

---

## 🧠 Dettagli sul Modello di Machine Learning

Il componente predittivo è basato su un modello **Random Forest** ottimizzato, addestrato tramite lo script in `ml_pipeline/train.py`.

* **Dataset Utilizzato:** Event log estratti da una piattaforma di streaming musicale (Sparkify).
* **Gestione dello Sbilanciamento:** Poiché gli utenti che abbandonano la piattaforma sono una minoranza rispetto a quelli fedeli, è stata implementata la tecnica **SMOTE (Synthetic Minority Over-sampling Technique)** per bilanciare le classi durante la fase di addestramento.
* **Ricerca degli Iperparametri (Grid Search):**
  Il modello è stato ottimizzato testando diverse combinazioni attraverso Cross-Validation a 3 fold, ricercando la configurazione migliore che massimizzi la metrica F1-Score:
  1. `n_estimators`: `[50, 100, 200]`
  2. `max_depth`: `[5, 10, None]`
  3. `min_samples_split`: `[2, 5, 10]`

---

## 📊 Risultati e Visualizzazioni Generati

Eseguendo la pipeline di training (`train.py`), verranno generati automaticamente nella cartella `ml_pipeline/outputs/` i seguenti file utili per la stesura della relazione finale del progetto:
* 📉 **`dist_before.png` / `dist_after.png`**: Grafici a barre che mostrano la distribuzione delle classi prima e dopo l'applicazione del campionamento SMOTE sul training set.
* 🟦 **`confusion_matrix.png`**: Matrice di confusione calcolata sul test set per visualizzare i Veri Positivi, Veri Negativi e i falsi allarmi.
* 📈 **`roc_curve.png`**: Curva ROC (Receiver Operating Characteristic) completa di calcolo dell'area sottesa (AUC).
* 📊 **`feature_importance.png`**: Grafico a barre orizzontali che ordina l'importanza relativa delle diverse feature nel determinare la propensione all'abbandono.

---

## ⚙️ Tecnologie Utilizzate

| Componente | Tecnologia |
| :--- | :--- |
| **Frontend Framework** | Next.js / React / TypeScript |
| **Backend API** | FastAPI / Python |
| **Machine Learning** | Scikit-Learn / Pandas / Numpy |
| **Data Balancing** | Imbalanced-Learn (SMOTE) |
| **Data Viz** | Matplotlib / Seaborn |

---

## 💻 Come Avviare l'Applicazione

### 1. Addestramento del Modello (Opzionale se già addestrato)
```bash
# Entra nella cartella root del progetto
python ml_pipeline/train.py
```
*Verrà generato il file `backend/model.pkl` e tutte le immagini analitiche.*

### 2. Avvio del Server Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Avvio della Dashboard (Frontend)
In un terminale separato:
```bash
cd frontend
npm install
npm run dev
```
L'interfaccia utente sarà accessibile all'indirizzo `http://localhost:3000`.