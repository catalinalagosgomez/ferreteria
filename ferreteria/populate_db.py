from app import db, app
from models import Producto, Sucursal, Stock

with app.app_context():
    db.drop_all()
    db.create_all()

    # Crear productos
    p1 = Producto(codigo="FER-12345", nombre="Taladro Percutor", marca="Bosch")
    p2 = Producto(codigo="FER-67890", nombre="Sierra Circular", marca="Makita")
    
    db.session.add_all([p1, p2])
    db.session.commit()

    # Crear sucursales
    s1 = Sucursal(nombre="Sucursal 1")
    s2 = Sucursal(nombre="Sucursal 2")
    s3 = Sucursal(nombre="Casa Matriz")

    db.session.add_all([s1, s2, s3])
    db.session.commit()

    # Asignar stock
    stock = [
        Stock(producto_id=p1.id, sucursal_id=s1.id, precio=333, cantidad=31),
        Stock(producto_id=p1.id, sucursal_id=s2.id, precio=222, cantidad=23),
        Stock(producto_id=p1.id, sucursal_id=s3.id, precio=999, cantidad=10),

        Stock(producto_id=p2.id, sucursal_id=s1.id, precio=555, cantidad=12),
        Stock(producto_id=p2.id, sucursal_id=s3.id, precio=777, cantidad=6)
    ]

    db.session.add_all(stock)
    db.session.commit()

    print("Base de datos poblada")
