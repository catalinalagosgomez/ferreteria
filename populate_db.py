from app import db, app
from models import Sucursal

with app.app_context():
    db.drop_all()   # Elimina todas las tablas
    db.create_all() # Crea las tablas según los modelos actuales

    # Luego puedes poblar la base con datos iniciales, si quieres:
    if Sucursal.query.count() == 0:
        sucursales = [
            Sucursal(nombre="Sucursal 1", cantidad=50, precio=333),
            Sucursal(nombre="Sucursal 2", cantidad=23, precio=222),
            Sucursal(nombre="Sucursal 3", cantidad=100, precio=1111)
        ]
        db.session.add_all(sucursales)

        db.session.commit()
