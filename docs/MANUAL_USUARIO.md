# Manual de usuario de ROBAC

ROBAC controla quién entra a la comunidad y qué puede hacer cada persona dentro del
sistema. Cada persona tiene un rol (Administrador, Guardia o Residente) y solo ve en el
menú las secciones de su rol.

## Para todos

### Entrar

1. Escribe tu **Correo** y tu **Contraseña** y pulsa **Iniciar sesión**.
2. Si escribes mal la contraseña 5 veces en 15 minutos, tu acceso se bloquea 15 minutos.
   Puedes esperar o recuperar tu contraseña.
3. Para salir, pulsa **Cerrar sesión** (arriba a la derecha). La sesión también se cierra
   sola a las 8 horas.

### Recuperar la contraseña

1. En la pantalla de inicio pulsa **¿Olvidaste tu contraseña?**
2. Escribe tu correo y pulsa **Enviar código**. Te llega un código de 6 dígitos.
3. Escribe el **Código de 6 dígitos**, tu **Nueva contraseña** y la confirmación, y pulsa
   **Guardar nueva contraseña**.

El código dura 15 minutos, sirve una sola vez y admite 5 intentos. Si no te llega, espera un
minuto antes de pedir otro o pide al administrador que restablezca tu contraseña.

### Cambiar tu contraseña

En **Mi cuenta** escribe tu **Contraseña actual**, la **Nueva contraseña** (mínimo 6
caracteres) y **Confirmar nueva contraseña**, y pulsa **Cambiar contraseña**. Las sesiones
abiertas en otros dispositivos se cierran.

## Residente

En **Visitas**:

1. En **Autorizar una visita** escribe el **Nombre del visitante** y la **Fecha de la visita**
   y pulsa **Autorizar visita**. Aparece como *Por llegar* y el guardia la ve en su lista.
2. Si la visita ya no viene, pulsa **Cancelar** en su fila. Solo puedes cancelar tus propias
   visitas y solo antes de que entren.

## Guardia

En **Visitas** aparecen todas las visitas autorizadas por los residentes:

1. Cuando llega el visitante, pulsa **Registrar entrada**. La visita pasa a *Dentro*.
2. Cuando se va, pulsa **Registrar salida**. La visita pasa a *Salió*.

En **Bitácora** consultas todo lo que pasó en el sistema (ver la sección Bitácora).

## Administrador

### Usuarios

- **Nuevo usuario:** escribe Nombre, Correo, Contraseña temporal, Rol y Casa, y pulsa
  **Crear usuario**. Entrega la contraseña temporal a la persona y pídele que la cambie en
  **Mi cuenta**.
- **Editar:** cambia nombre, correo o casa y pulsa **Guardar cambios**.
- **Rol:** elígelo en el selector de la fila de cada usuario; el cambio aplica de inmediato.
- **Restablecer contraseña:** dentro de Editar, escribe una contraseña temporal y pulsa
  **Restablecer contraseña**. También quita el bloqueo por intentos fallidos.
- **Desactivar / Activar:** una cuenta desactivada no puede entrar y sus sesiones se cierran.

No puedes cambiar tu propio rol ni desactivar tu propia cuenta.

### Roles y permisos

La matriz muestra los permisos en filas y los roles en columnas. Marca o desmarca la
casilla para dar o quitar un permiso; el cambio aplica de inmediato. El Administrador no
puede quitarse el permiso de gestionar roles.

## Bitácora (Administrador y Guardia)

- **Buscar** encuentra a una persona, acción o detalle en todo el historial.
- **Desde** y **Hasta** limitan los movimientos a un rango de días.
- Los movimientos se muestran de 50 en 50; usa **Más antiguos** y **Más recientes** para
  cambiar de página.
- Los bloqueos por intentos fallidos aparecen como *Acceso bloqueado temporalmente*.

## Para quien instala el sistema

Las instrucciones para instalar, configurar el correo, crear al primer administrador,
respaldar la base de datos y publicar están en [`robac/README.md`](../robac/README.md).
