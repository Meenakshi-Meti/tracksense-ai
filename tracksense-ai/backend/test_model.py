from huggingface_hub import from_pretrained_keras

print("Loading model...")

model = from_pretrained_keras(
    "00BER/dc-weather-prediction"
)

print("Model loaded successfully!")

model.summary()