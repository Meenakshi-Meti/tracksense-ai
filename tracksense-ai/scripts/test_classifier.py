"""
Test the trained model on sample images
"""

import torch
import sys
from pathlib import Path
from PIL import Image
from torchvision import transforms

# Import model class
from train_classifier import SurfaceConditionModel

def test_model():
    # Find model checkpoint
    checkpoint_dir = Path("checkpoints")
    
    if not checkpoint_dir.exists():
        print("✗ No checkpoints folder found!")
        print("Please train the model first: python scripts/train_classifier.py")
        return
    
    ckpt_files = list(checkpoint_dir.glob("*.ckpt"))
    if not ckpt_files:
        print("✗ No .ckpt files found!")
        print("Please train the model first: python scripts/train_classifier.py")
        return
    
    # Load latest checkpoint
    latest_ckpt = max(ckpt_files, key=lambda p: p.stat().st_mtime)
    print(f"Loading model from: {latest_ckpt}\n")
    
    model = SurfaceConditionModel.load_from_checkpoint(str(latest_ckpt))
    model.eval()
    
    # Image transform
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    # Test on all images
    test_dirs = {
        'DRY': Path('data/raw/dry'),
        'DAMP': Path('data/raw/damp'),
        'WET': Path('data/raw/wet'),
    }
    
    classes = ['DRY', 'DAMP', 'WET']
    correct = 0
    total = 0
    
    print("="*70)
    print("TESTING MODEL")
    print("="*70 + "\n")
    
    for true_condition, data_dir in test_dirs.items():
        if not data_dir.exists():
            continue
        
        image_files = sorted(list(data_dir.glob('*.jpg')) + list(data_dir.glob('*.png')))
        
        if not image_files:
            continue
        
        print(f"\n{true_condition.upper()} IMAGES:")
        print("-" * 70)
        
        for img_path in image_files[:3]:  # Test first 3 images
            image = Image.open(img_path).convert('RGB')
            image_tensor = transform(image).unsqueeze(0)
            
            with torch.no_grad():
                logits = model(image_tensor)
                probs = torch.softmax(logits, dim=1)
                confidence, pred_idx = torch.max(probs, 1)
            
            pred_class = classes[pred_idx.item()]
            confidence_pct = confidence.item() * 100
            
            # Check if correct
            is_correct = pred_class == true_condition
            correct += int(is_correct)
            total += 1
            
            symbol = "✓" if is_correct else "✗"
            
            print(f"{symbol} {img_path.name}")
            print(f"   True: {true_condition}")
            print(f"   Predicted: {pred_class} ({confidence_pct:.1f}%)")
            print(f"   Probabilities: DRY={probs[0,0]*100:.1f}% DAMP={probs[0,1]*100:.1f}% WET={probs[0,2]*100:.1f}%")
            print()
    
    if total > 0:
        accuracy = (correct / total) * 100
        print("="*70)
        print(f"Test Accuracy: {accuracy:.1f}% ({correct}/{total} correct)")
        print("="*70)

if __name__ == "__main__":
    test_model()