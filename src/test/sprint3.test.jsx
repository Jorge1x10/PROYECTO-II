import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

async function entrar(user, correo, password) {
  await user.type(screen.getByLabelText('Correo'), correo)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

async function salir(user) {
  await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
  await screen.findByRole('button', { name: 'Iniciar sesión' })
}

function tarjetaDeEdicion(nombre) {
  return screen.getByRole('heading', { name: `Editar a ${nombre}` }).closest('section')
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/login'
})

describe('Sprint 3 · contraseñas cifradas', () => {
  it('migra las contraseñas en texto plano y ya no las guarda', async () => {
    render(<App />)
    await waitFor(
      () => {
        const guardado = localStorage.getItem('robac-datos')
        expect(guardado).toContain('"clave"')
        expect(guardado).not.toContain('"password"')
        expect(guardado).not.toContain('admin123')
      },
      { timeout: 5000 },
    )
  })

  it('sigue permitiendo entrar con las contraseñas ya migradas', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(
      () => expect(localStorage.getItem('robac-datos')).not.toContain('"password"'),
      { timeout: 5000 },
    )
    await entrar(user, 'admin@robac.mx', 'admin123')
    expect(await screen.findByText('Hola, Ana Administradora')).toBeInTheDocument()
  })
})

describe('Sprint 3 · mi cuenta', () => {
  it('cambia la contraseña: la nueva funciona y la anterior ya no', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await user.click(await screen.findByText('Mi cuenta'))

    await user.type(await screen.findByLabelText('Contraseña actual'), 'residente123')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave-1')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByRole('status')).toHaveTextContent('se cambió')

    await salir(user)
    await entrar(user, 'residente@robac.mx', 'residente123')
    expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos')

    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Contraseña'), 'nueva-clave-1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
  })

  it('rechaza la contraseña actual incorrecta y la confirmación que no coincide', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await user.click(await screen.findByText('Mi cuenta'))

    await user.type(await screen.findByLabelText('Contraseña actual'), 'equivocada')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave-1')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('actual no es correcta')

    await user.clear(screen.getByLabelText('Confirmar nueva contraseña'))
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra-cosa')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no coincide')
  })
})

describe('Sprint 3 · administración de usuarios', () => {
  it('edita los datos de un usuario y no permite un correo repetido', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    await user.click(await screen.findByText('Usuarios'))

    await user.click(await screen.findByRole('button', { name: 'Editar a Rosa Residente' }))
    let tarjeta = within(tarjetaDeEdicion('Rosa Residente'))
    await user.clear(tarjeta.getByLabelText('Casa'))
    await user.type(tarjeta.getByLabelText('Casa'), 'Casa 99')
    await user.click(tarjeta.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Casa 99')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar a Rosa Residente' }))
    tarjeta = within(tarjetaDeEdicion('Rosa Residente'))
    await user.clear(tarjeta.getByLabelText('Correo'))
    await user.type(tarjeta.getByLabelText('Correo'), 'admin@robac.mx')
    await user.click(tarjeta.getByRole('button', { name: 'Guardar cambios' }))
    expect(await tarjeta.findByRole('alert')).toHaveTextContent('Ya existe')
  })

  it('restablece la contraseña de un usuario y queda en la bitácora', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    await user.click(await screen.findByText('Usuarios'))

    await user.click(await screen.findByRole('button', { name: 'Editar a Rosa Residente' }))
    const tarjeta = within(tarjetaDeEdicion('Rosa Residente'))
    await user.type(tarjeta.getByLabelText('Contraseña temporal'), 'temporal1')
    await user.click(tarjeta.getByRole('button', { name: 'Restablecer contraseña' }))
    expect(await tarjeta.findByRole('status')).toHaveTextContent('restablecida')

    await user.click(screen.getByText('Bitácora'))
    expect(await screen.findByText('Contraseña restablecida')).toBeInTheDocument()
    unmount()

    window.location.hash = '#/login'
    localStorage.removeItem('robac-sesion')
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'temporal1')
    expect(await screen.findByText('Hola, Rosa Residente')).toBeInTheDocument()
  })

  it('el residente no ve las opciones de administración de usuarios', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    await screen.findByText('Hola, Rosa Residente')
    expect(screen.queryByRole('button', { name: /Editar a/ })).not.toBeInTheDocument()
  })
})
