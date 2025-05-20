from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
from extensions import db
import time
import requests

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

notificaciones = []


@app.route('/')
def index():
    return render_template('index.html')

# todos los productos y su stock por sucursal
@app.route("/api/productos", methods=["GET"])
def obtener_productos():
    from models import Producto, Stock  # IMPORTAR AQUÍ
    productos = Producto.query.all()
    data = []
    for p in productos:
        stock_info = Stock.query.filter_by(producto_id=p.id).all()
        stock_data = [
            {
                "sucursal_id": s.sucursal_id,
                "precio": s.precio,
                "cantidad": s.cantidad
            }
            for s in stock_info
        ]
        data.append({
            "codigo": p.codigo,
            "nombre": p.nombre,
            "marca": p.marca,
            "stock": stock_data
        })
    return jsonify(data)

# Conversión CLP a USD
@app.route("/api/convertir", methods=["GET"])
def convertir_usd():
    clp = float(request.args.get("clp"))
    try:
        response = requests.get("https://api.exchangerate-api.com/v4/latest/CLP")
        rate = response.json()['rates']['USD']
        usd = clp * rate
        return jsonify({"usd": round(usd, 2)})
    except:
        return jsonify({"error": "No se pudo obtener el tipo de cambio"}), 500


# Registro de venta y disminución de stock
@app.route("/api/venta", methods=["POST"])
def registrar_venta():
    from models import Stock  # IMPORTAR AQUÍ
    data = request.json
    producto_id = data["producto_id"]
    sucursal_id = data["sucursal_id"]
    cantidad = data["cantidad"]

    stock = Stock.query.filter_by(producto_id=producto_id, sucursal_id=sucursal_id).first()
    if not stock or stock.cantidad < cantidad:
        return jsonify({"success": False, "msg": "Stock insuficiente"}), 400

    stock.cantidad -= cantidad
    db.session.commit()

    if stock.cantidad == 0:
        notificaciones.append(f"Stock bajo en sucursal {sucursal_id}")

    return jsonify({"success": True})

# 4. SSE para notificación de stock bajo
@app.route('/api/sse/stock-bajo')
def sse_stock_bajo():
    def evento():
        last = 0
        while True:
            if len(notificaciones) > last:
                yield f"data: {notificaciones[last]}\n\n"
                last += 1
            time.sleep(1)
    return Response(evento(), mimetype='text/event-stream')

if __name__ == '__main__':
    with app.app_context():
        from models import * 
        db.create_all()
    app.run(debug=True, port=5001)
