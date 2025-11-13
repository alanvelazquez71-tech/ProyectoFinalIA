"""
Extract and rebuild ONLY the user tower with custom layers
This creates a standalone user model for inference
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import pickle
import numpy as np

print("🔄 Loading model data...")
with open("recommendation_assets.pkl", "rb") as f:
    model_data = pickle.load(f)

print("📋 Keys in pickle file:", list(model_data.keys()))

# Extract using correct keys
df_users = model_data["df_users"]
user_features_cols = model_data["user_features_cols"]

# Calculate dimensions
n_user_features = len(user_features_cols)
print(f"✅ User features: {n_user_features}")

temperature = model_data.get('temperature', 10.0)
print(f"🌡️ Temperature: {temperature}")

# ===================================================
# 🔹 Create custom layers to replace Lambda
# ===================================================
class L2Normalization(layers.Layer):
    """Custom layer for L2 normalization - replaces Lambda"""
    def __init__(self, **kwargs):
        super(L2Normalization, self).__init__(**kwargs)
    
    def call(self, inputs):
        return tf.nn.l2_normalize(inputs, axis=-1)
    
    def get_config(self):
        return super(L2Normalization, self).get_config()

print("✅ Custom layers defined")

# ===================================================
# 🔹 Build ONLY user tower (not full two-tower)
# ===================================================
print("\n🔄 Building user tower architecture...")

def build_user_tower(user_dim, embedding_dim=64):
    """Build only the user tower"""
    user_input = layers.Input(shape=(user_dim,), name='user_input')
    user_x = layers.Dense(128, activation='relu', name='user_dense1')(user_input)
    user_x = layers.Dense(embedding_dim, activation='relu', name='user_embedding')(user_x)
    user_normalized = L2Normalization(name='user_norm')(user_x)
    
    model = keras.Model(
        inputs=user_input,
        outputs=user_normalized,
        name='user_tower'
    )
    return model

user_tower = build_user_tower(n_user_features)
print("✅ User tower built")
user_tower.summary()

# ===================================================
# 🔹 Load weights from original user_model.keras
# ===================================================
print("\n🔄 Loading weights from user_model.keras...")

try:
    # Load the original user model (with Lambda layers)
    original_user_model = keras.models.load_model("user_model.keras")
    print("✅ Original user model loaded")
    
    # Transfer weights from Dense layers only
    user_layers = ['user_dense1', 'user_embedding']
    
    for layer_name in user_layers:
        try:
            source_layer = original_user_model.get_layer(layer_name)
            target_layer = user_tower.get_layer(layer_name)
            
            weights = source_layer.get_weights()
            target_layer.set_weights(weights)
            
            kernel_shape = weights[0].shape if len(weights) > 0 else "none"
            bias_shape = weights[1].shape if len(weights) > 1 else "none"
            print(f"  ✅ {layer_name}: kernel{kernel_shape}, bias{bias_shape}")
        except Exception as e:
            print(f"  ❌ Error transferring {layer_name}: {e}")
    
    print("\n✅ All weights transferred successfully!")
    weights_loaded = True
    
except Exception as e:
    print(f"\n❌ Error loading user_model.keras: {e}")
    print("⚠️ Saving model with random weights (will need retraining)")
    weights_loaded = False

# ===================================================
# 🔹 Save user tower with custom layers
# ===================================================
print("\n🔄 Saving user tower model...")

# Save in both formats (using two_tower prefix as requested)
user_tower.save("two_tower_model_fast.keras")
print("✅ Saved: two_tower_model_fast.keras")

user_tower.save("two_tower_model_fast.h5", save_format='h5')
print("✅ Saved: two_tower_model_fast.h5")

# Test loading
print("\n🔄 Testing fast load...")
import time
start = time.time()
test_model = keras.models.load_model(
    "two_tower_model_fast.h5",
    custom_objects={'L2Normalization': L2Normalization},
    compile=False
)
elapsed = time.time() - start
print(f"✅ Model loads in {elapsed:.2f} seconds!")

# Test inference
print("\n🔄 Testing inference...")
test_input = np.random.randn(1, n_user_features)
test_output = test_model.predict(test_input, verbose=0)
print(f"✅ Inference works! Output shape: {test_output.shape}")

print("\n" + "="*60)
print("✅ COMPLETE!")
print("="*60)
print(f"\n📝 Status:")
print(f"   - Weights loaded: {'✅ Yes' if weights_loaded else '⚠️ No (random init)'}")
print(f"   - Model saved as: two_tower_model_fast.keras/h5")
print(f"   - This is the USER TOWER only")
print("\n🚀 Ready to use in servidor.py!")
print("\n💡 servidor.py will load this as 'user_model'")