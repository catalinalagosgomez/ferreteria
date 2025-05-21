from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from extensions import db
from models import Sucursal
import requests 
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

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

if __name__ == '__main__':
    app.run(debug=True)


  
@app.route("/calcular_usd", methods=["POST"])
def calcular_usd():
    data = request.get_json()
    total_clp = float(data.get("total_clp", 0))
    usd_api = requests.get("https://api.exchangerate-api.com/v4/latest/CLP").json()
    tasa = usd_api["rates"]["USD"]
    total_usd = round(total_clp * tasa, 2)
    return jsonify({"total_usd": total_usd})
