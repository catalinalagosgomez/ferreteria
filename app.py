from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from extensions import db
from models import Sucursal
import requests
import time
from transbank.webpay.webpay_plus.transaction import Transaction

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.secret_key = 'ferreteria_secreta_key'  
db.init_app(app)

# Credenciales Transbank
commerce_code = "597055555532"
api_key = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sucursales')
def buscar_sucursal():
    filtro = request.args.get('filtro')

    if filtro and filtro in ['1', '2', '3']:
        sucursales_filtradas = Sucursal.query.filter(Sucursal.id == int(filtro)).all()
    else:
        sucursales_filtradas = Sucursal.query.all()

    resultado = [{
        'id': suc.id,
        'nombre': suc.nombre,
        'cantidad': suc.cantidad,
        'precio': suc.precio
    } for suc in sucursales_filtradas]

    return jsonify(resultado)

@app.route("/calcular_usd", methods=["POST"])
def calcular_usd():
    data = request.get_json()
    total_clp = float(data.get("total_clp", 0))
    usd_api = requests.get("https://api.exchangerate-api.com/v4/latest/CLP").json()
    tasa = usd_api["rates"]["USD"]
    total_usd = round(total_clp * tasa, 2)
    return jsonify({"total_usd": total_usd})



# transbank 

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
        # response contiene 'url' y 'token'
        return jsonify({"url": response['url'], "token": response['token']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/retorno_pago", methods=["GET", "POST"])
def retorno_pago():
    token_ws = request.args.get("token_ws") if request.method == "GET" else request.form.get("token_ws")

    if not token_ws:
        return "Token no válido", 400

    tx = Transaction.build_for_integration(commerce_code=commerce_code, api_key=api_key)

    try:
        response = tx.commit(token_ws)

        if response["status"] == "AUTHORIZED":
            # Pago aprobado
            nombre_sucursal = session.get("ultima_sucursal", "Sucursal 1")
            cantidad = int(session.get("ultima_cantidad", 1))
            # Aquí puedes actualizar stock, registrar la venta, etc.
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



if __name__ == '__main__':
    app.run(debug=True)
