"""
TRACKSENSE AI - Surface Condition Classifier Training
This file ONLY defines the model. Training only runs when executed directly.
"""

import os
import torch
import torch.nn as nn
from torch.optim import Adam
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms, models
from pathlib import Path
from PIL import Image
import pytorch_lightning as pl
from pytorch_lightning.callbacks import ModelCheckpoint, EarlyStopping
import warnings

warnings.filterwarnings('ignore')

# ============================================================================
# DATASET CLASS
# ============================================================================

class TrackDataset(Dataset):
    """Load track images from folder structure"""
    
    def __init__(self, data_dir, transform=None):
        self.data_dir = Path(data_dir)
        self.transform = transform
        
        self.class_to_idx = {'dry': 0, 'damp': 1, 'wet': 2}
        self.idx_to_class = {v: k for k, v in self.class_to_idx.items()}
        
        self.image_paths = []
        self.labels = []
        
        for condition, idx in self.class_to_idx.items():
            condition_dir = self.data_dir / condition
            
            if not condition_dir.exists():
                continue
            
            image_files = list(condition_dir.glob('*.jpg')) + \
                         list(condition_dir.glob('*.png')) + \
                         list(condition_dir.glob('*.jpeg'))
            
            print(f"Found {len(image_files)} images in '{condition}/'")
            
            for img_path in image_files:
                self.image_paths.append(str(img_path))
                self.labels.append(idx)
        
        print(f"\n✓ Total images found: {len(self.image_paths)}\n")
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        label = self.labels[idx]
        
        try:
            image = Image.open(img_path).convert('RGB')
        except Exception as e:
            print(f"Error loading {img_path}: {e}")
            image = Image.new('RGB', (224, 224), color='black')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label

# ============================================================================
# MODEL CLASS
# ============================================================================

class SurfaceConditionModel(pl.LightningModule):
    """ResNet50 model for track condition classification"""
    
    def __init__(self, learning_rate=1e-3):
        super().__init__()
        self.learning_rate = learning_rate
        
        self.model = models.resnet50(pretrained=True)
        
        for param in list(self.model.parameters())[:-10]:
            param.requires_grad = False
        
        num_features = self.model.fc.in_features
        
        self.model.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 3)
        )
        
        self.loss_fn = nn.CrossEntropyLoss()
        self.save_hyperparameters()
    
    def forward(self, x):
        return self.model(x)
    
    def training_step(self, batch, batch_idx):
        images, labels = batch
        logits = self(images)
        loss = self.loss_fn(logits, labels)
        self.log('train_loss', loss, prog_bar=True)
        return loss
    
    def validation_step(self, batch, batch_idx):
        images, labels = batch
        logits = self(images)
        loss = self.loss_fn(logits, labels)
        preds = torch.argmax(logits, dim=1)
        acc = (preds == labels).float().mean()
        self.log('val_loss', loss, prog_bar=True)
        self.log('val_acc', acc, prog_bar=True)
    
    def configure_optimizers(self):
        return Adam(self.parameters(), lr=self.learning_rate)

# ============================================================================
# TRAINING FUNCTION - ONLY RUNS WHEN FILE IS EXECUTED DIRECTLY
# ============================================================================

def train_model():
    """Training function - only called when script is run directly"""
    
    print("\n" + "="*70)
    print("TRACKSENSE AI - MODEL TRAINING")
    print("="*70 + "\n")
    
    DATA_DIR = "data/raw"
    BATCH_SIZE = 4
    MAX_EPOCHS = 30
    LEARNING_RATE = 1e-3
    
    # Check if data exists
    if not os.path.exists(DATA_DIR):
        print(f"✗ ERROR: {DATA_DIR} not found!")
        print("Please run: python scripts/create_sample_images.py")
        return
    
    # Define transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    # Load data
    print("📦 Loading dataset...")
    full_dataset = TrackDataset(DATA_DIR, transform=train_transform)
    
    if len(full_dataset) == 0:
        print("✗ ERROR: No images found in data/raw/")
        print("Please run: python scripts/create_sample_images.py")
        return
    
    # Split data
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    
    train_dataset, val_dataset = random_split(
        full_dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )
    
    # Create loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        num_workers=0
    )
    
    print(f"✓ Train samples: {len(train_dataset)}")
    print(f"✓ Val samples: {len(val_dataset)}\n")
    
    # Create model
    print("🧠 Creating model...")
    model = SurfaceConditionModel(learning_rate=LEARNING_RATE)
    
    # Create trainer
    os.makedirs("checkpoints", exist_ok=True)
    
    trainer = pl.Trainer(
        max_epochs=MAX_EPOCHS,
        accelerator="auto",
        devices=1,
        callbacks=[
            ModelCheckpoint(
                dirpath="checkpoints",
                filename="best_model",
                monitor="val_acc",
                mode="max",
                save_top_k=1,
                verbose=True
            ),
            EarlyStopping(
                monitor="val_loss",
                patience=5,
                mode="min",
                verbose=True
            )
        ],
        enable_progress_bar=True,
        log_every_n_steps=1,
        enable_model_summary=True
    )
    
    # Train
    print("🚀 Starting training...\n")
    trainer.fit(model, train_loader, val_loader)
    
    print("\n" + "="*70)
    print("✓ TRAINING COMPLETE!")
    print("="*70)
    print(f"Model saved to: checkpoints/best_model.ckpt")
    print("\nNext step: python scripts/test_classifier.py")

# ============================================================================
# ONLY RUN TRAINING IF THIS FILE IS EXECUTED DIRECTLY
# ============================================================================

if __name__ == "__main__":
    train_model()