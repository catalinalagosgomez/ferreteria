from app import db, app
from models import Sucursal, Sucursal_original, Producto, StockSucursal

with app.app_context():
    db.drop_all()
    db.create_all()

    if Sucursal.query.count() == 0:
        sucursales = [
            Sucursal(nombre="Sucursal 1", cantidad=50, precio=333),
            Sucursal(nombre="Sucursal 2", cantidad=23, precio=222),
            Sucursal(nombre="Sucursal 3", cantidad=100, precio=1111)
        ]
        db.session.add_all(sucursales)
        db.session.commit()

    # Crear sucursales originales
    s1 = Sucursal_original(nombre="Sucursal Central")
    s2 = Sucursal_original(nombre="Sucursal San Jose")
    s3 = Sucursal_original(nombre="Sucursal San Pedro")
    db.session.add_all([s1, s2, s3])
    db.session.commit()

    # Lista de productos con imágenes
    productos_info = [
        ("Martillo", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Sierra", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Clavos", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Destornillador", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Alicate", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Taladro", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Brocas", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta Métrica", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Nivel", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Llave Inglesa", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Tornillos", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Pintura", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Rodillo", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Lija", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Pegamento", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta de Cemento", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta de Madera", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta de Plástico", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta de Madera de Color", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png"),
        ("Cinta de Madera de Piel", "https://seogenial.com/wp-content/uploads/2020/05/las-mejores-tiendas-online-para-vender-tus-productos-en-peru.png")
    ]

    productos = []
    for nombre, url in productos_info:
        producto = Producto(nombre=nombre, imagen=url)
        productos.append(producto)
    db.session.add_all(productos)
    db.session.commit()

    import random

    # Asignar todos los productos a cada sucursal con stock/valor aleatorio
    for sucursal in [s1, s2, s3]:
        for producto in productos:
            stock = StockSucursal(
                sucursal_id=sucursal.id,
                producto_id=producto.id,
                cantidad=random.randint(5, 50),
                precio=round(random.uniform(990, 19990), 2)
            )
            db.session.add(stock)

    db.session.commit()
    print("Base de datos creada y poblada correctamente con imágenes y stock.")
