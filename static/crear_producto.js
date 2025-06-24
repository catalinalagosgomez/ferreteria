

document.addEventListener("DOMContentLoaded", async () => {
  await cargarSucursales();

  console.log("sucursales cargadas",cargarSucursales());

  const form = document.getElementById("formCrearProducto");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const precio = parseInt(document.getElementById("precio").value);
    const stock = parseInt(document.getElementById("stock").value);
    const imagen = document.getElementById("imagen").value;
    const sucursalId = document.getElementById("sucursalSelect").value; // ← ojo con ID correcto

    const producto = {
      nombre,
      precio,
      stock,
      imagen,
      sucursal_id: sucursalId === 'todas' ? null : parseInt(sucursalId)
    };

    try {
      const res = await fetch("/crear_producto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto)
      });

      if (!res.ok) throw new Error("No se pudo crear el producto");

      document.getElementById("mensajeCreacion").textContent = "✅ Producto creado correctamente.";
      form.reset();
    } catch (err) {
      document.getElementById("mensajeCreacion").textContent = "❌ Error: " + err.message;
    }
  });
});

async function cargarSucursales() {
  const select = document.getElementById('sucursalSelect');
  try {
    const res = await fetch('/sucursales');
    if (!res.ok) throw new Error("No se pudo obtener las sucursales");
    const data = await res.json();

    select.innerHTML = '';

    // Opción para todas las sucursales
    const opcionTodas = document.createElement('option');
    opcionTodas.value = 'todas';
    opcionTodas.textContent = 'Todas las sucursales';
    select.appendChild(opcionTodas);

    // Agrega las sucursales
    data.forEach(suc => {
      const option = document.createElement('option');
      option.value = suc.sucursal_id;
      option.textContent = suc.nombre_sucursal;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error al cargar sucursales:", err);
    select.innerHTML = '<option value="">Error al cargar sucursales</option>';
  }
}
