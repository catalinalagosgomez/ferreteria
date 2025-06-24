document.addEventListener("DOMContentLoaded", cargarProductos);

async function cargarProductos() {
  const contenedor = document.getElementById("listaProductos");
  const mensaje = document.getElementById("mensaje");
  contenedor.innerHTML = "Cargando productos...";

  try {
    const res = await fetch('/productos');
    if (!res.ok) throw new Error("Error al cargar productos");
    const productos = await res.json();

    if (productos.length === 0) {
      contenedor.innerHTML = "<p>No hay productos registrados.</p>";
      return;
    }

    contenedor.innerHTML = "";

    productos.forEach(p => {
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow flex items-center space-x-4";

      div.innerHTML = `
        <img src="${p.imagen || 'https://via.placeholder.com/80'}" alt="${p.nombre}" class="w-20 h-20 object-cover rounded" />
        <div class="flex-1">
          <h2 class="font-semibold">${p.nombre}</h2>
          <p>ID: ${p.id}</p>
        </div>
        <button class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" data-id="${p.id}">
          Eliminar
        </button>
      `;

      contenedor.appendChild(div);

      div.querySelector("button").addEventListener("click", () => eliminarProducto(p.id));
    });

  } catch (error) {
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
    mensaje.textContent = error.message;
  }
}

async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de eliminar este producto?")) return;

  try {
    const res = await fetch(`/eliminar_producto/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al eliminar producto");
    }
    document.getElementById("mensaje").textContent = "Producto eliminado correctamente.";
    cargarProductos();  // Refresca la lista
  } catch (error) {
    document.getElementById("mensaje").textContent = "Error: " + error.message;
  }
}
