"""匯出訓練好嘅模型做 ONNX 畀 app 用。用法：.venv/bin/python export.py [--weights runs/tiles/weights/best.pt]"""
import argparse
import os
import shutil

from ultralytics import YOLO

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_SIZE = 640
# onnxruntime-web 1.30 支援嘅 opset；揀穩陣嘅版本
OPSET = 17
TARGET = os.path.join(ML_DIR, '..', 'public', 'models', 'tiles.onnx')

parser = argparse.ArgumentParser()
parser.add_argument('--weights', default=os.path.join(ML_DIR, 'runs', 'tiles', 'weights', 'best.pt'))
args = parser.parse_args()

exported = YOLO(args.weights).export(format='onnx', imgsz=MODEL_SIZE, opset=OPSET, simplify=True, dynamic=False)
os.makedirs(os.path.dirname(TARGET), exist_ok=True)
shutil.copyfile(exported, TARGET)
print(f'{exported} -> {os.path.normpath(TARGET)}')
