from app import db, app
from models import Sucursal, Sucursal_original, Producto, StockSucursal

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
        
    #crea la sucursal original
    s1 = Sucursal_original(nombre="Sucursal Cenral")
    s2 = Sucursal_original(nombre="Sucursal San Jose")
    s3 = Sucursal_original(nombre="Sucursal San Pedro")
    
    db.session.add_all([s1, s2, s3])
    db.session.commit()
    
    #crea los productos
    nombres_productos = [
        "Martillo", "Sierra", "Clavos", "Destornillador", "Alicate",
        "Taladro", "Brocas", "Cinta Métrica", "Nivel", "Llave Inglesa",
        "Tornillos", "Pintura", "Rodillo", "Lija", "Pegamento", "Cinta",
        "Cinta de Cemento", "Cinta de Madera", "Cinta de Plástico",
        "Cinta de Madera de Color", "Cinta de Madera de Piel"
    ]
    productos = [Producto(nombre=nombre) for nombre in nombres_productos]
    db.session.add_all(productos)
    db.session.commit()
    
    import random
    # Crea stock para cada sucursal y producto
    
    for sucursal in [s1, s2, s3]:
        productos_sucursal = random.sample(productos, k=6)  # 6 productos distintos por sucursal
        for prod in productos_sucursal:
            stock = StockSucursal(
                sucursal_id=sucursal.id,
                producto_id=prod.id,
                cantidad=random.randint(5, 50),
                precio=round(random.uniform(990, 19990), 2)
            )
            db.session.add(stock)

    db.session.commit()
    print("Base de datos poblada con sucursales y productos.")
    print("Base de datos creada y poblada correctamente.")