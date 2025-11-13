"""
Extract model architecture without loading Lambda layers
This will help us understand what's in the model
"""
import zipfile
import json

print("🔍 Examining model file structure...")

with zipfile.ZipFile("two_tower_model.keras", 'r') as z:
    print("\n📁 Files in model archive:")
    for file in z.namelist():
        print(f"  - {file}")
    
    # Read config
    if "config.json" in z.namelist():
        print("\n📄 Reading model configuration...")
        with z.open("config.json") as f:
            config = json.load(f)
        
        print("\n🏗️ Model Architecture:")
        print(f"Model class: {config.get('class_name', 'Unknown')}")
        
        # Find Lambda layers
        print("\n🔍 Searching for Lambda layers...")
        layers = config.get('config', {}).get('layers', [])
        
        lambda_layers = []
        for i, layer in enumerate(layers):
            layer_class = layer.get('class_name', '')
            layer_name = layer.get('config', {}).get('name', f'layer_{i}')
            
            if layer_class == 'Lambda':
                lambda_layers.append({
                    'index': i,
                    'name': layer_name,
                    'config': layer.get('config', {})
                })
                print(f"\n⚠️ Found Lambda layer #{i}: {layer_name}")
                print(f"   Config: {layer.get('config', {})}")
        
        if lambda_layers:
            print(f"\n❌ Found {len(lambda_layers)} Lambda layer(s) - these are causing the issue")
            print("\n💡 Solutions:")
            print("1. Re-train the model without Lambda layers")
            print("2. Replace Lambda layers with custom Layer classes")
            print("3. Use functional API operations instead of Lambda")
        else:
            print("\n✅ No Lambda layers found - issue may be elsewhere")
        
        # Save full config for inspection
        with open("model_config.json", "w") as f:
            json.dump(config, f, indent=2)
        print("\n💾 Full config saved to: model_config.json")

print("\n✅ Analysis complete!")