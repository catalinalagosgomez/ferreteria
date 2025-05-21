
from extensions import db


class Sucursal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)   # <-- Debe existir
    precio = db.Column(db.Float, nullable=False)       # <-- Debe existir

