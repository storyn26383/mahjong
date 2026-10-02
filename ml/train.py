"""訓練 YOLO11n 認麻將牌。用法：.venv/bin/python train.py --epochs 50 --imgsz 640 [--fraction 0.05]"""
import argparse
import os

import torch
import yaml
from ultralytics import YOLO

CPU_THREADS = os.cpu_count() or 1
ML_DIR = os.path.dirname(os.path.abspath(__file__))

parser = argparse.ArgumentParser()
parser.add_argument('--epochs', type=int, default=50)
parser.add_argument('--imgsz', type=int, default=640)
parser.add_argument('--batch', type=int, default=16)
parser.add_argument('--fraction', type=float, default=1.0)
parser.add_argument('--patience', type=int, default=8)
parser.add_argument('--name', default='tiles')
args = parser.parse_args()

torch.set_num_threads(CPU_THREADS)

# Ultralytics 唔係以 yaml 所在位置解析相對 path，所以喺度轉做絕對路徑
with open(os.path.join(ML_DIR, 'dataset.yaml')) as source:
    dataset = yaml.safe_load(source)
dataset['path'] = os.path.join(ML_DIR, dataset['path'])
resolved_dataset = os.path.join(ML_DIR, 'runs', 'dataset.resolved.yaml')
os.makedirs(os.path.dirname(resolved_dataset), exist_ok=True)
with open(resolved_dataset, 'w') as target:
    yaml.safe_dump(dataset, target, allow_unicode=True)
YOLO(os.path.join(ML_DIR, 'yolo11n.pt')).train(
    data=resolved_dataset,
    epochs=args.epochs,
    imgsz=args.imgsz,
    batch=args.batch,
    fraction=args.fraction,
    patience=args.patience,
    device='cpu',
    workers=CPU_THREADS,
    project=os.path.join(ML_DIR, 'runs'),
    name=args.name,
    exist_ok=True,
    # 資料集已經做咗翻轉同旋轉；麻將牌唔應該再左右反轉
    fliplr=0.0,
)
