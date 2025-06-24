# grpc_server.py
import grpc
from concurrent import futures
import productos_pb2
import productos_pb2_grpc
from models import Producto
from extensions import db
from flask import Flask

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.secret_key = 'ferreteria_secreta_key'
db.init_app(app)

class ProductoService(productos_pb2_grpc.ProductoServiceServicer):
    def ListarProductos(self, request, context):
        with app.app_context():
            productos = Producto.query.all()
            respuesta = productos_pb2.ListaProductos()
            for prod in productos:
                for stock in prod.stock_sucursales:
                    item = productos_pb2.Producto(
                        id=prod.id,
                        nombre=prod.nombre,
                        imagen=prod.imagen or "",
                        precio=stock.precio,
                        stock=stock.cantidad,
                        sucursal_id=stock.sucursal.id,
                        nombre_sucursal=stock.sucursal.nombre
                    )
                    respuesta.productos.append(item)
            return respuesta

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    productos_pb2_grpc.add_ProductoServiceServicer_to_server(ProductoService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("✅ Servidor gRPC corriendo en puerto 50051")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
