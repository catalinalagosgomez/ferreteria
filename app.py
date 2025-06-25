import grpc
import productos_pb2
import productos_pb2_grpc

from flask import Flask, Response, json, request, jsonify, render_template, session, redirect, stream_with_context, url_for
from flask_cors import CORS
import requests
import time

from extensions import db
from models import Sucursal, Sucursal_original, Producto, StockSucursal
from transbank.webpay.webpay_plus.transaction import Transaction

from sqlalchemy.orm import close_all_sessions

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.secret_key = 'ferreteria_secreta_key'
db.init_app(app)

# Credenciales Transbank
commerce_code = "597055555532"
api_key = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"


# ------------------- Rutas públicas -------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sucursales')
def ver_sucursales_con_productos():
    sucursales = Sucursal_original.query.all()
    resultado = []
    for suc in sucursales:
        productos = []
        for stock in suc.stock_productos:
            productos.append({
                "producto_id": stock.producto.id,
                "nombre_producto": stock.producto.nombre,
                "cantidad": stock.cantidad,
                "precio": stock.precio,
                "imagen": stock.producto.imagen ,
                "stock": stock.cantidad
            })
        resultado.append({
            "sucursal_id": suc.id,
            "nombre_sucursal": suc.nombre,
            "productos": productos
        })
    return jsonify(resultado)

@app.route("/calcular_usd", methods=["POST"])
def calcular_usd():
    data = request.get_json()
    total_clp = float(data.get("total_clp", 0))
    usd_api = requests.get("https://api.exchangerate-api.com/v4/latest/CLP").json()
    tasa = usd_api["rates"]["USD"]
    total_usd = round(total_clp * tasa, 2)
    return jsonify({"total_usd": total_usd})


# ------------------- Transbank -------------------

@app.route("/iniciar_pago", methods=["POST"])
def iniciar_pago():
    data = request.get_json()
    amount = data.get("amount", 1000)
    session["ultima_sucursal"] = data.get("sucursal", "Sucursal 1")
    session["ultima_cantidad"] = data.get("cantidad", 1)

    buy_order = f"ORD-{int(time.time())}"
    session_id = f"SID-{int(time.time())}"
    return_url = url_for("retorno_pago", _external=True)

    tx = Transaction.build_for_integration(commerce_code=commerce_code, api_key=api_key)

    try:
        response = tx.create(buy_order, session_id, amount, return_url)
        return jsonify({"url": response['url'], "token": response['token']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ------------------- Retorno de pago -------------------

@app.route("/retorno_pago", methods=["GET", "POST"])
def retorno_pago():
    token_ws = request.args.get("token_ws") if request.method == "GET" else request.form.get("token_ws")

    if not token_ws:
        return "Token no válido", 400

    tx = Transaction.build_for_integration(commerce_code=commerce_code, api_key=api_key)

    try:
        response = tx.commit(token_ws)

        if response["status"] == "AUTHORIZED":
            nombre_sucursal = session.get("ultima_sucursal", "Sucursal 1")
            cantidad = int(session.get("ultima_cantidad", 1))
            sucursal = Sucursal.query.filter_by(nombre=nombre_sucursal).first()
            if sucursal and sucursal.cantidad >= cantidad:
                sucursal.cantidad -= cantidad
                db.session.commit()
                session["mensaje"] = f"✅ Compra exitosa en {nombre_sucursal} - {cantidad} unidades compradas"
            else:
                session["mensaje"] = f"⚠️ Pago exitoso, pero stock insuficiente para registrar venta"
            return redirect(url_for("index"))
        else:
            return f"<h1 style='color:red;'>❌ Pago rechazado</h1><p>Status: {response['status']}</p>"
    except Exception as e:
        return f"<h1 style='color:red;'>❌ Error en commit()</h1><pre>{str(e)}</pre>"

# ------------------- obtener productos gRPC -------------------
def obtener_productos_grpc():
    # Conexión a el servicio de productos
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = productos_pb2_grpc.ProductoServiceStub(channel)
        respuesta = stub.ListarProductos(productos_pb2.ProductoVacio())

        productos = []
        for prod in respuesta.productos:
            productos.append({
                "id": prod.id,
                "nombre": prod.nombre,
                "imagen": prod.imagen,
                "precio": prod.precio,
                "stock": prod.stock,
                "sucursal_id": prod.sucursal_id,
                "nombre_sucursal": prod.nombre_sucursal
                
            })
        return productos
    
#-------------------- stock verificacion -------------------

def check_stock_bajo():
    while True:
        bajos = []
        try:
            stocks_bajos = StockSucursal.query.filter(StockSucursal.cantidad < 10).all()
            for stock in stocks_bajos:
                bajos.append({
                    "sucursal": stock.sucursal.nombre,
                    "producto": stock.producto.nombre,
                    "stock": stock.cantidad
                })
        finally:
            db.session.remove()  # Limpia sesión para evitar fugas

        if bajos:
            data = json.dumps(bajos)
            yield f"event: stock_bajo\ndata: {data}\n\n"

        time.sleep(10)
        
# ------------------- api de stock bajo -------------------
        
@app.route('/stream_stock')
def stream_stock():
    response = Response(stream_with_context(check_stock_bajo()), mimetype='text/event-stream')
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"  # Para nginx y otros
    return response

# ------------------- Admin -------------------
@app.route('/crear_productos', methods=['GET'])
def form_crear_producto():
    return render_template('crear_producto.html')

# ------------------- Eliminar productos -------------------

@app.route('/eliminar_productos', methods=['GET'])
def form_eliminar_productos():
    return render_template('eliminar_productos.html')

# ------------------- Obtener productos -------------------
                
@app.route('/productos', methods=['GET'])
def obtener_productos():
    try:
        productos = obtener_productos_grpc()
        return jsonify(productos)
    except Exception as e:
        return jsonify({"error": "No se pudo obtener productos desde el microservicio", "detalle": str(e)}), 500


# ------------------- Crear Producto -------------------

@app.route('/crear_producto', methods=['POST'])
def crear_producto():
    datos = request.get_json()

    nombre = datos.get('nombre')
    precio = datos.get('precio')
    stock = datos.get('stock')
    imagen = datos.get('imagen')
    sucursal_id = datos.get('sucursal_id')  # puede ser None si es "todas"

    if not all([nombre, precio, stock]):
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    try:
        if sucursal_id in [None, 'todas']:
            # Crear el producto para todas las sucursales
            sucursales = Sucursal_original.query.all()

            for suc in sucursales:
                nuevo_producto = Producto(nombre=nombre, imagen=imagen)
                db.session.add(nuevo_producto)
                db.session.flush()  # Necesario para obtener el ID

                stock_sucursal = StockSucursal(
                    producto_id=nuevo_producto.id,
                    sucursal_id=suc.id,
                    cantidad=stock,
                    precio=precio
                )
                db.session.add(stock_sucursal)
        else:
            # Crear el producto para una sola sucursal
            nuevo_producto = Producto(nombre=nombre, imagen=imagen)
            db.session.add(nuevo_producto)
            db.session.flush()

            stock_sucursal = StockSucursal(
                producto_id=nuevo_producto.id,
                sucursal_id=int(sucursal_id),
                cantidad=stock,
                precio=precio
            )
            db.session.add(stock_sucursal)

        db.session.commit()
        return jsonify({"mensaje": "✅ Producto creado correctamente"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Error al crear el producto: {str(e)}"}), 500
    
# ------------------- Eliminar Producto -------------------
@app.route('/eliminar_producto/<int:producto_id>', methods=['DELETE'])
def eliminar_producto(producto_id):
    producto = Producto.query.get(producto_id)
    if not producto:
        return jsonify({"error": "Producto no encontrado"}), 404

    try:
        db.session.delete(producto)
        db.session.commit()
        return jsonify({"mensaje": "Producto eliminado correctamente"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al eliminar el producto", "detalle": str(e)}), 500
    
    
#-------------------- Endpoints de productos por sucursal -------------------

@app.route('/productos_sucursal/<int:sucursal_id>')
def productos_por_sucursal(sucursal_id):
    sucursal = Sucursal_original.query.get_or_404(sucursal_id)
    productos = []
    for stock in sucursal.stock_productos:
        productos.append({
            "producto_id": stock.producto.id,
            "nombre_producto": stock.producto.nombre,
            "cantidad": stock.cantidad,
            "precio": stock.precio,
            "imagen": stock.producto.imagen,
            "stock": stock.cantidad
        })
    return jsonify({
        "sucursal_id": sucursal.id,
        "nombre_sucursal": sucursal.nombre,
        "productos": productos
    })

if __name__ == '__main__':
    app.run(debug=True,threaded=True)
