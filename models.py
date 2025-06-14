
from extensions import db

# esta sucursal no la borrare para no causar error al momento del merge
class Sucursal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)   # <-- Debe existir
    precio = db.Column(db.Float, nullable=False)       # <-- Debe existir

# Esta es la sucursal original que se mantendra para evitar conflictos
class Sucursal_original(db.Model):
    __tablename__ = 'sucursal_original'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    stock_productos = db.relationship('StockSucursal', back_populates='sucursal', cascade='all, delete-orphan')
    
#Aqui estan los productos y su stock por sucursal
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    stock_sucursales = db.relationship('StockSucursal', back_populates='producto', cascade='all, delete-orphan')
    
# Aqui se define la relacion entre Sucursal y Producto a traves de StockSucursal
class StockSucursal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sucursal_id = db.Column(db.Integer, db.ForeignKey('sucursal_original.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    cantidad = db.Column(db.Integer, default=0)
    precio = db.Column(db.Float, nullable=False)
#
    sucursal = db.relationship('Sucursal_original', back_populates='stock_productos')
    producto = db.relationship('Producto', back_populates='stock_sucursales')
