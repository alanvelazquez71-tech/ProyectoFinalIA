from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
from tensorflow import keras
import numpy as np
import pickle
import uvicorn
import traceback
import sys
import os

# ===================================================
# Definición de capas personalizadas (debe coincidir con rebuild_model.py)
# ===================================================
class L2Normalization(tf.keras.layers.Layer):
    """Capa personalizada para normalización L2"""
    def __init__(self, **kwargs):
        super(L2Normalization, self).__init__(**kwargs)
    
    def call(self, inputs):
        return tf.nn.l2_normalize(inputs, axis=-1)
    
    def get_config(self):
        return super(L2Normalization, self).get_config()

class TemperatureScale(tf.keras.layers.Layer):
    """Capa personalizada para escalado por temperatura"""
    def __init__(self, temperature=10.0, **kwargs):
        super(TemperatureScale, self).__init__(**kwargs)
        self.temperature = temperature
    
    def call(self, inputs):
        return inputs / self.temperature
    
    def get_config(self):
        config = super(TemperatureScale, self).get_config()
        config.update({"temperature": self.temperature})
        return config

custom_objects = {
    'L2Normalization': L2Normalization,
    'TemperatureScale': TemperatureScale,
}

print("Capas personalizadas registradas")

# ===================================================
# Carga del modelo y datos al iniciar
# ===================================================
print("Cargando assets...")
try:
    with open("recommendation_assets.pkl", "rb") as f:
        model_data = pickle.load(f)
    print("Assets cargados correctamente")
    print(f"Claves disponibles: {list(model_data.keys())}")
except Exception as e:
    print(f"Error al cargar assets: {e}")
    traceback.print_exc()
    sys.exit(1)

# Extraer datos con las claves correctas
try:
    user_embeddings = model_data["user_embeddings"]
    city_embeddings = model_data["city_embeddings"]
    user_ids = np.array(model_data["user_ids_list"])
    city_ids = np.array(model_data["city_ids_list"])
    df_cities = model_data["df_cities"]
    df_users = model_data["df_users"]
    user_scaler = model_data["user_scaler"]
    user_features_cols = model_data["user_features_cols"]
    feature_columns_filter = model_data["feature_columns_filter"]
    feature_names_map = model_data["feature_names_map"]
    temperature = model_data["temperature"]
    
    print("Datos extraídos correctamente")
    print(f"   - Total de usuarios: {len(user_ids)}")
    print(f"   - Total de ciudades: {len(city_ids)}")
    print(f"   - Forma de embeddings de usuarios: {user_embeddings.shape}")
    print(f"   - Forma de embeddings de ciudades: {city_embeddings.shape}")
    print(f"   - Temperatura: {temperature}")
    
except KeyError as e:
    print(f"Falta una clave requerida: {e}")
    print(f"Claves disponibles: {list(model_data.keys())}")
    sys.exit(1)

# Cargar modelo de usuario para predicciones de nuevos usuarios
try:
    print("Cargando modelo de usuario...")
    if os.path.exists("two_tower_model_fast.h5"):
        user_model = keras.models.load_model(
            "two_tower_model_fast.h5",
            custom_objects=custom_objects,
            compile=False
        )
        print("Modelo cargado desde two_tower_model_fast.h5")
    elif os.path.exists("two_tower_model_fast.keras"):
        user_model = keras.models.load_model(
            "two_tower_model_fast.keras",
            custom_objects=custom_objects,
            compile=False
        )
        print("Modelo cargado desde two_tower_model_fast.keras")
    else:
        print("Archivo two_tower_model_fast no encontrado")
        user_model = None
except Exception as e:
    print(f"Advertencia: No se pudo cargar el modelo de usuario: {e}")
    print(f"   Tipo de error: {type(e).__name__}")
    traceback.print_exc()
    print("   No estarán disponibles las recomendaciones para nuevos usuarios")
    user_model = None

# ===================================================
# Inicialización de FastAPI
# ===================================================
app = FastAPI(title="Two-Tower Recommender API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================================================
# Esquemas de solicitud
# ===================================================
class RecommendRequest(BaseModel):
    user_id: int
    top_n: int = 5
    show_scores: bool = False

class NewUserRequest(BaseModel):
    top_n: int = 5
    show_scores: bool = False
    age: float = None
    preferred_budget: float = None
    preferred_avg_temp: float = None
    culture: float = None
    adventure: float = None
    nature: float = None
    beaches: float = None
    nightlife: float = None
    cuisine: float = None
    wellness: float = None
    urban: float = None
    seclusion: float = None

# ===================================================
# Funciones de recomendación
# ===================================================
def recommend_top_n_optimized(user_id: int, top_n: int = 5):
    """Recomienda ciudades para usuarios existentes usando embeddings precomputados"""
    try:
        user_idx = np.where(user_ids == user_id)[0]
        if len(user_idx) == 0:
            return {"error": f"User ID {user_id} no encontrado"}
        
        user_idx = user_idx[0]
        user_emb = user_embeddings[user_idx].reshape(1, -1)
        
        cosine_scores = np.dot(user_emb, city_embeddings.T).flatten()
        scaled_scores = cosine_scores * temperature
        final_scores = tf.nn.sigmoid(scaled_scores).numpy()
        
        top_indices = np.argsort(final_scores)[::-1][:top_n]
        
        recommendations = []
        for idx in top_indices:
            city_id = city_ids[idx]
            score = final_scores[idx]
            
            city_row = df_cities[df_cities.index == idx]
            if len(city_row) > 0:
                city_row = city_row.iloc[0]
                city_name = city_row.get("city", f"City_{city_id}")
                country = city_row.get("country", "")
            else:
                city_name = f"City_{city_id}"
                country = ""
            
            recommendations.append({
                "city_id": city_id,
                "score": float(score),
                "city_name": city_name,
                "country": country
            })
        
        return recommendations
        
    except Exception as e:
        print(f"Error en recommend_top_n_optimized: {e}")
        traceback.print_exc()
        return {"error": str(e)}

def recommend_new_user(req: NewUserRequest):
    """Genera recomendaciones para un usuario anónimo"""
    if user_model is None:
        return {"error": "Modelo de usuario no cargado. Recomendaciones no disponibles."}
    
    try:
        profile_data = df_users[user_features_cols].mean().to_dict()
        
        input_data = req.model_dump(exclude_unset=True)
        for key, value in input_data.items():
            if key in user_features_cols and value is not None:
                profile_data[key] = value
        
        raw_features = np.array([profile_data[col] for col in user_features_cols]).reshape(1, -1)
        normalized_features = user_scaler.transform(raw_features)
        
        user_emb = user_model.predict(normalized_features, verbose=0)
        
        cosine_scores = np.dot(user_emb, city_embeddings.T).flatten()
        scaled_scores = cosine_scores * temperature
        final_scores = tf.nn.sigmoid(scaled_scores).numpy()
        
        sorted_idx = np.argsort(final_scores)[::-1]
        
        recommendations = []
        seen_cities = set()
        
        for idx in sorted_idx:
            if len(recommendations) >= req.top_n:
                break
            
            city_id = city_ids[idx]
            if city_id in seen_cities:
                continue
            
            score = final_scores[idx]
            city_row = df_cities[df_cities.index == idx]
            
            if len(city_row) > 0:
                city_row = city_row.iloc[0]
                city_name = city_row.get("city", f"City_{city_id}")
                country = city_row.get("country", "")
                city_features = city_row[feature_columns_filter].values.astype(float)
                user_filter_features = np.array([profile_data.get(col, 0) for col in feature_columns_filter])
                diffs = -np.abs(user_filter_features - city_features)
                top3_idx = np.argsort(diffs)[-3:]
                top3_features = [feature_names_map[j] for j in top3_idx[::-1]]
            else:
                city_name = f"City_{city_id}"
                country = ""
                top3_features = []
            
            recommendations.append({
                "city_id": city_id,
                "score": float(score),
            })
            
            seen_cities.add(city_id)
        
        return recommendations
        
    except Exception as e:
        print(f"Error en recommend_new_user: {e}")
        traceback.print_exc()
        return {"error": str(e)}

# ===================================================
# Endpoints de la API
# ===================================================
@app.post("/recommend")
def recommend_existing(req: RecommendRequest):
    """Obtiene las recomendaciones principales para un usuario existente"""
    try:
        recs = recommend_top_n_optimized(req.user_id, req.top_n)
        
        if isinstance(recs, dict) and "error" in recs:
            return recs
        
        response = {
            "user_id": req.user_id,
            "top_n": req.top_n,
            "recommendations": recs
        }
        
        if not req.show_scores:
            for rec in response["recommendations"]:
                rec.pop("score", None)
        
        return response
    except Exception as e:
        print(f"Error en /recommend: {e}")
        traceback.print_exc()
        return {"error": str(e)}

@app.post("/recommend/new_user")
def recommend_new(req: NewUserRequest):
    """Obtiene las recomendaciones principales para un usuario nuevo"""
    try:
        recs = recommend_new_user(req)
        
        if isinstance(recs, dict) and "error" in recs:
            return recs
        
        response = {
            "top_n": req.top_n,
            "recommendations": recs
        }
        
        if not req.show_scores:
            for rec in response["recommendations"]:
                rec.pop("score", None)
        
        return response
    except Exception as e:
        print(f"Error en /recommend/new_user: {e}")
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/")
def root():
    """Verificación de estado"""
    return {
        "status": "ok",
        "message": "Two-Tower Recommender API en ejecución",
        "total_users": len(user_ids),
        "total_cities": len(city_ids),
        "new_user_support": user_model is not None
    }

@app.get("/users")
def get_users():
    """Obtiene la lista de IDs de usuarios disponibles"""
    return {
        "total_users": len(user_ids),
        "user_ids": user_ids[:100].tolist()
    }

@app.get("/cities")
def get_cities():
    """Obtiene la lista de ciudades disponibles"""
    cities = []
    for idx, city_id in enumerate(city_ids[:100]):
        city_row = df_cities[df_cities.index == idx]
        if len(city_row) > 0:
            city_row = city_row.iloc[0]
            city_name = city_row.get("city", f"City_{city_id}")
            country = city_row.get("country", "")
        else:
            city_name = f"City_{city_id}"
            country = ""
        
        cities.append({
            "city_id": city_id,
            "city_name": city_name,
            "country": country
        })
    
    return {
        "total_cities": len(city_ids),
        "cities": cities
    }

# ===================================================
# Ejecución del servidor
# ===================================================
if __name__ == "__main__":
    print("\n" + "="*50)
    print("Iniciando servidor FastAPI")
    print("="*50)
    print("URL: http://127.0.0.1:8000")
    print("Documentación: http://127.0.0.1:8000/docs")
    print("="*50 + "\n")
    
    uvicorn.run("servidor:app", host="127.0.0.1", port=8000, reload=True)
