
from extensions import db
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String, unique=True)
    nombre = db.Column(db.String)
    marca = db.Column(db.String)

class Sucursal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String)

class Stock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    sucursal_id = db.Column(db.Integer, db.ForeignKey('sucursal.id'))
    cantidad = db.Column(db.Integer)
    precio = db.Column(db.Float)
