import { Injectable } from '@angular/core';

export type TutorRole = 'student' | 'teacher' | 'parent' | 'admin';
export interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp: Date; }

@Injectable({ providedIn: 'root' })
export class AiTutorService {

  private studentReplies: Array<{ keywords: string[]; reply: string }> = [
    {
      keywords: ['hola', 'buenas', 'hey', 'hi', 'saludos'],
      reply: '¡Hola Axel! 👋 Me alegra verte por aquí. Soy ByteBot, tu tutor personal de ByteKids.\n\n¿En qué te puedo ayudar hoy? Puedo explicarte:\n🐍 Python · 🌐 HTML/CSS · 🎮 Roblox · 🧩 Scratch · 🤖 Robótica\n\n¡Pregunta sin miedo! Estoy aquí para ti. 😊'
    },
    {
      keywords: ['gracias', 'thank', 'genial', 'excelente', 'perfecto', 'entendí'],
      reply: '¡Me alegra mucho que lo hayas entendido! 🎉\n\nEso es lo más importante — no importa cuánto tardes, sino que **lo entiendas de verdad**. ¿Tienes alguna otra duda o quieres practicar con un ejercicio? 💪\n\n¡Tú lo estás haciendo muy bien! 🌟'
    },
    {
      keywords: ['no entiendo', 'no entiendo', 'confundido', 'difícil', 'complicado', 'no sé'],
      reply: '¡No te preocupes! 😊 Es completamente normal no entender algo a la primera.\n\nDime **exactamente qué parte** te confunde y te explico de otra manera. A veces necesitamos 2 o 3 intentos con diferentes ejemplos.\n\n¿Me dices cuál es el concepto específico que se siente difícil? 🤔'
    },
    {
      keywords: ['variable', 'variables', 'guardar', 'cajita', 'dato'],
      reply: '¡Las variables son como cajitas mágicas para guardar información! 📦\n\nEn Python se crean así:\n```python\nnombre = "Axel"\nedad = 10\npuntos = 1500\nes_estudiante = True\n```\n\nCada cajita tiene:\n- Un **nombre** (para identificarla)\n- Un **valor** (lo que guarda)\n- Un **tipo** (número, texto, verdadero/falso)\n\n¡Intenta crear una variable con tu materia favorita! 🎯'
    },
    {
      keywords: ['bucle', 'for', 'loop', 'repetir', 'ciclo', 'while'],
      reply: '¡Los bucles son superpoderes! 🔄 Te ahorran escribir lo mismo mil veces.\n\n**Bucle `for`** — cuando sabes cuántas veces repetir:\n```python\nfor i in range(5):\n    print(f"Vuelta número {i}")\n```\n\n**Bucle `while`** — cuando repites hasta que algo cambie:\n```python\ncontador = 0\nwhile contador < 3:\n    print("¡Hola!")\n    contador += 1\n```\n\n🤔 ¿Cuál de los dos quieres practicar primero?'
    },
    {
      keywords: ['función', 'funciones', 'def', 'método', 'métodos'],
      reply: '¡Las funciones son como recetas de cocina reutilizables! 👨‍🍳\n\nEn lugar de repetir código, creas una función y la llamas cuando la necesites:\n```python\ndef saludar(nombre):\n    print(f"¡Hola, {nombre}! 👋")\n\n# Usarla es fácil:\nsaludar("Axel")    # → ¡Hola, Axel!\nsaludar("Sofía")   # → ¡Hola, Sofía!\n```\n\nLas partes de una función:\n- `def` → le dices a Python que vas a crear una función\n- `nombre` → el nombre que le das\n- `(parámetros)` → información que recibe\n- El código adentro → lo que hace\n\n¿Quieres crear tu propia función? 🚀'
    },
    {
      keywords: ['if', 'condicional', 'condición', 'else', 'elif', 'si entonces'],
      reply: '¡Los condicionales son la toma de decisiones del código! 🧠\n\n```python\npuntos = 850\n\nif puntos >= 1000:\n    print("🏆 ¡Nivel EXPERTO!")\nelif puntos >= 500:\n    print("⭐ ¡Nivel INTERMEDIO!")\nelse:\n    print("🌱 ¡Sigue practicando!")\n```\n\nEs como un semáforo:\n🟢 `if` → primera condición\n🟡 `elif` → otras condiciones\n🔴 `else` → si ninguna se cumple\n\n¿Quieres que creemos un programa que use condicionales juntos? 💡'
    },
    {
      keywords: ['lista', 'listas', 'array', 'arreglo', 'append', 'index'],
      reply: '¡Las listas son como mochilas que guardan muchas cosas! 🎒\n\n```python\nmaterias = ["Python", "HTML", "Scratch", "Robótica"]\n\nprint(materias[0])      # → Python (empieza en 0!)\nprint(materias[2])      # → Scratch\n\nmaterias.append("Roblox")  # Agregar al final\nprint(len(materias))        # → 5 (cuántos hay)\n```\n\n⚠️ **¡Importante!** Las listas empiezan en el índice `0`, no en `1`. A esto se le llama "indexación cero" y lo usan TODOS los lenguajes de programación.\n\n¿Quieres hacer una lista de tus cosas favoritas en Python? 📝'
    },
    {
      keywords: ['diccionario', 'dict', 'clave', 'valor', 'key'],
      reply: '¡Los diccionarios en Python son como un diccionario real, pero de datos! 📖\n\n```python\nalumno = {\n    "nombre": "Axel",\n    "edad": 10,\n    "materia_fav": "Python",\n    "puntos": 1500\n}\n\nprint(alumno["nombre"])       # → Axel\nprint(alumno["puntos"])       # → 1500\n\n# Modificar:\nalumno["puntos"] = 1750\nalumno["nivel"] = "Avanzado"  # Agregar nuevo\n```\n\n¡Los diccionarios son perfectos para guardar información organizada, como un perfil de jugador! 🎮'
    },
    {
      keywords: ['html', 'web', 'página', 'etiqueta', 'tag'],
      reply: '¡HTML es el esqueleto de todas las páginas web! 🌐\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n    <title>Mi primera web</title>\n</head>\n<body>\n    <h1>¡Hola Mundo!</h1>\n    <p>Esta es mi primera página web.</p>\n    <a href="https://google.com">Ir a Google</a>\n    <img src="foto.jpg" alt="Mi foto">\n</body>\n</html>\n```\n\nEtiquetas más usadas:\n- `<h1>` a `<h6>` → Títulos\n- `<p>` → Párrafos\n- `<a>` → Links\n- `<img>` → Imágenes\n- `<div>` → Cajas/contenedores\n\n¿Quieres que te explique CSS para darle estilo? 🎨'
    },
    {
      keywords: ['css', 'estilo', 'color', 'diseño', 'estético'],
      reply: '¡CSS es el maquillaje de las páginas web! 💅\n\n```css\n/* Cambia el color y tamaño del título */\nh1 {\n    color: purple;\n    font-size: 32px;\n    font-family: Arial;\n}\n\n/* Dale estilo a todos los párrafos */\np {\n    color: #333333;\n    line-height: 1.6;\n}\n\n/* Una caja con borde redondeado */\n.mi-caja {\n    background-color: lightblue;\n    border-radius: 10px;\n    padding: 20px;\n}\n```\n\nCSS usa:\n- **Selectores** → ¿A qué elemento aplicas?\n- **Propiedades** → ¿Qué cambias?\n- **Valores** → ¿A qué lo cambias?\n\n¿Quieres aprender a hacer una página bonita? 🎨'
    },
    {
      keywords: ['javascript', 'js', 'interactivo', 'botón', 'evento', 'click'],
      reply: '¡JavaScript hace que las páginas web sean interactivas! ⚡\n\n```javascript\n// Cambiar texto al hacer click\nfunction saludar() {\n    let nombre = prompt("¿Cómo te llamas?");\n    document.getElementById("saludo").innerHTML = \n        "¡Hola, " + nombre + "! 👋";\n}\n\n// Calculadora simple\nfunction sumar(a, b) {\n    return a + b;\n}\nconsole.log(sumar(5, 3));  // → 8\n```\n\nCon JavaScript puedes:\n🔘 Responder a clicks de botones\n✅ Validar formularios\n🎬 Crear animaciones\n🌐 Cargar datos sin recargar la página\n\n¿Quieres hacer tu primer botón interactivo? 🚀'
    },
    {
      keywords: ['roblox', 'lua', 'studio', 'personaje', 'game'],
      reply: '¡Roblox Studio usa Lua — un lenguaje de programación real! 🎮\n\n```lua\n-- Hacer que el personaje salte alto\nlocal jugador = game.Players.LocalPlayer\nlocal character = jugador.Character\nlocal humanoid = character:WaitForChild("Humanoid")\n\n-- Cambiar velocidad y altura de salto\nhumanoid.WalkSpeed = 32\nhumanoid.JumpPower = 75\n\n-- Imprimir un mensaje en la consola\nprint("¡Personaje configurado! 🏃")\n```\n\nCosas geniales que puedes hacer en Roblox Studio:\n🏗️ Construir mundos 3D\n🎯 Crear misiones y objetivos\n💰 Agregar sistemas de monedas\n🔫 Programar armas y poderes\n\n¿Qué tipo de juego quieres crear? 🌟'
    },
    {
      keywords: ['scratch', 'bloques', 'sprite', 'disfraz', 'escenario'],
      reply: '¡Scratch es programación con bloques visuales — perfecto para empezar! 🧩\n\n**Para hacer que tu personaje se mueva:**\n1. 🚩 Bloque "Cuando se presione la bandera verde"\n2. 🔁 Bloque "Por siempre" (bucle infinito)\n3. ❓ Dentro: "Si tecla → presionada, entonces"\n4. ➡️ Agrega "Mover 10 pasos" adentro del `si`\n\n**Para hacer un juego de atrapar objetos:**\n1. Crea un sprite que caiga desde arriba (`y` disminuye)\n2. Crea otro sprite que se mueva con el teclado\n3. Agrega condición: `si toca [sprite jugador]`\n4. Suma puntos al marcador\n\n¿Qué tipo de animación o juego quieres crear en Scratch? 🎮'
    },
    {
      keywords: ['arduino', 'robótica', 'robot', 'sensor', 'led', 'motor'],
      reply: '¡La robótica combina programación con electrónica! 🤖\n\n```cpp\n// Hacer parpadear un LED con Arduino\nint ledPin = 13;  // LED conectado al pin 13\n\nvoid setup() {\n    pinMode(ledPin, OUTPUT);  // Configurar como salida\n}\n\nvoid loop() {\n    digitalWrite(ledPin, HIGH);  // LED encendido\n    delay(1000);                  // Esperar 1 segundo\n    digitalWrite(ledPin, LOW);   // LED apagado\n    delay(1000);                  // Esperar 1 segundo\n}\n```\n\n¡Este código hace parpadear un LED como el corazón de un robot! ❤️\n\n**Proyectos geniales para empezar:**\n🚗 Carro que evita obstáculos\n🌡️ Sensor de temperatura\n🎵 Piano con piezorresistencias\n\n¿Qué proyecto de robótica te gustaría hacer? ⚡'
    },
    {
      keywords: ['matemat', 'número', 'calculo', 'suma', 'resta', 'multiplicar', 'dividir', 'fraccion'],
      reply: '¡Las matemáticas y la programación son mejores amigas! 📐\n\n```python\n# Operaciones básicas\nsuma = 15 + 7         # 22\nresta = 20 - 8        # 12\nmultiplicacion = 6 * 9  # 54\ndivision = 30 / 4     # 7.5\ndivision_entera = 30 // 4  # 7 (sin decimales)\nresto = 17 % 5        # 2 (lo que sobra)\npotencia = 2 ** 8     # 256\n\n# Fracciones\nfrom fractions import Fraction\nmitad = Fraction(1, 2)\ntercio = Fraction(1, 3)\nprint(mitad + tercio)  # → 5/6\n```\n\n¿Hay alguna operación matemática específica con la que necesitas ayuda? 🔢'
    },
    {
      keywords: ['error', 'bug', 'falla', 'no funciona', 'equivocación', 'syntax'],
      reply: '¡Los errores son parte normal de programar — hasta los expertos los tienen! 🐛\n\n**Errores más comunes en Python:**\n\n```python\n# ❌ SyntaxError — falta algo en la escritura\nif x > 5    # Falta los dos puntos ::\nif x > 5:   # ✅ Correcto\n\n# ❌ NameError — variable no existe\nprint(nombre)  # Si nunca creaste "nombre"\nnombre = "Axel"\nprint(nombre)  # ✅ Correcto\n\n# ❌ IndentationError — sangría incorrecta\ndef suma():\nreturn 5     # ❌ No tiene sangría\ndef suma():\n    return 5  # ✅ Correcto\n```\n\nCómo arreglar errores:\n1. **Lee el mensaje** — Python te dice exactamente qué falló\n2. **Busca la línea** — el número de línea está en el error\n3. **Revisa letras** — mayúsculas/minúsculas importan\n\n¿Me compartes tu código y te ayudo a encontrar el error? 🔍'
    },
    {
      keywords: ['input', 'print', 'imprimir', 'mostrar', 'pedir', 'usuario'],
      reply: '¡`input()` y `print()` son tus herramientas para comunicarte con el usuario! 💬\n\n```python\n# Pedir información al usuario\nnombre = input("¿Cómo te llamas? ")\nedad = int(input("¿Cuántos años tienes? "))  # int() convierte a número\n\n# Mostrar resultados de diferentes formas\nprint("Hola", nombre)                    # Con coma\nprint("Hola " + nombre)                  # Con suma de texto\nprint(f"¡Hola {nombre}! Tienes {edad} años")  # f-string (la más moderna)\n\n# Salida:\n# ¿Cómo te llamas? Axel\n# ¿Cuántos años tienes? 10\n# ¡Hola Axel! Tienes 10 años\n```\n\nLas **f-strings** (con la `f` antes de las comillas) son la forma más elegante. ¿Quieres practicar haciendo un programa que le pregunte cosas al usuario? 🎤'
    },
    {
      keywords: ['string', 'texto', 'cadena', 'letra', 'mayúscula', 'minúscula', 'upper', 'lower'],
      reply: '¡Los strings son cadenas de texto — uno de los tipos más usados! 📝\n\n```python\nmensaje = "¡Hola, ByteKids!"\n\n# Operaciones con texto\nprint(len(mensaje))           # 15 — cuántos caracteres\nprint(mensaje.upper())        # ¡HOLA, BYTEKIDS!\nprint(mensaje.lower())        # ¡hola, bytekids!\nprint(mensaje.replace("Hola", "Hey"))  # ¡Hey, ByteKids!\n\n# Acceder a letras individuales\nprint(mensaje[0])   # ¡\nprint(mensaje[1])   # H\nprint(mensaje[-1])  # ! (el último)\n\n# Unir strings\nnombre = "Axel"\ncognome = "Partida"\ncompleto = nombre + " " + cognome\nprint(completo)  # Axel Partida\n```\n\n¿Quieres aprender más trucos con textos? Hay muchos más métodos geniales 🔤'
    },
    {
      keywords: ['proyecto', 'idea', 'crear', 'hacer', 'construir', 'programar'],
      reply: '¡Qué bueno que quieres crear algo! 🚀 Eso es lo más emocionante de programar.\n\n**Ideas de proyectos según tu nivel:**\n\n🌱 **Principiante:**\n- Calculadora de calificaciones\n- Juego de adivinanza de números\n- Generador de chistes aleatorios\n\n⭐ **Intermedio:**\n- Lista de tareas con guardar/borrar\n- Quiz de preguntas con puntuación\n- Reloj digital en pantalla\n\n🏆 **Avanzado:**\n- Juego de Piedra, Papel, Tijeras con IA\n- Mini-red social de la clase\n- Simulador de sistema solar\n\n¿Cuál de estos te llama más la atención? Te ayudo a empezarlo paso a paso 💡'
    },
    {
      keywords: ['python', 'programar', 'código', 'aprender', 'empezar', 'inicio', 'principiante'],
      reply: '¡Python es el mejor lenguaje para empezar a programar! 🐍\n\n**¿Por qué Python?**\n- Se lee casi como español\n- Lo usan Google, Netflix, Instagram\n- Sirve para IA, juegos, webs y ciencia\n\n**Tu primer programa en Python:**\n```python\n# Mi primer programa\nprint("¡Hola, mundo! 🌍")\n\nnombre = input("¿Cómo te llamas? ")\nprint(f"¡Bienvenido a ByteKids, {nombre}! 🎓")\n\n# Hagamos un cálculo\nedad = 10\naños_para_graduar = 18 - edad\nprint(f"En {años_para_graduar} años podrías trabajar como programador 💻")\n```\n\n¿Empezamos con variables, condicionales o bucles? ¡Dime y arrancamos! 🚀'
    },
    {
      keywords: ['misión', 'tarea', 'ejercicio', 'práctica', 'ayuda'],
      reply: '¡Claro, te ayudo con tu misión! 💪\n\nPara darte la mejor ayuda, cuéntame:\n\n1. 📋 **¿Cuál es la misión?** (¿qué dice exactamente?)\n2. 🤔 **¿Qué parte no entiendes?** (¿el concepto, el código, el enunciado?)\n3. 💻 **¿Ya intentaste algo?** (compárteme tu código aunque no funcione)\n\n¡No te preocupes si está incompleto o tiene errores! Eso es exactamente para lo que estoy aquí. Juntos lo resolvemos 🤝'
    },
    {
      keywords: ['examen', 'evaluación', 'prueba', 'calificación', 'repaso'],
      reply: '¡Vamos a prepararte para ese examen! 📚\n\n**Estrategia de repaso rápido:**\n\n**30 minutos antes:**\n1. Revisa los conceptos clave (no trates de aprender algo nuevo)\n2. Haz 2-3 ejercicios cortos para calentar\n3. Si hay código, léelo en voz alta\n\n**Temas más importantes en programación:**\n```python\n# Los 5 conceptos que SIEMPRE aparecen:\n# 1. Variables\n# 2. Condicionales (if/else)\n# 3. Bucles (for/while)\n# 4. Funciones (def)\n# 5. Listas\n```\n\n¿Sobre qué tema es tu examen? Te hago un repaso personalizado 🎯'
    },
    {
      keywords: ['aburrido', 'no me gusta', 'para qué', 'sirve', 'útil', 'por qué'],
      reply: '¡Entiendo que a veces puede parecer difícil o aburrido! 😅 Pero te cuento algo...\n\n**¿Para qué sirve programar en la vida real?**\n\n🎮 Los videojuegos que juegas — alguien los programó\n📱 Las apps de tu teléfono — código puro\n🤖 Los robots de las fábricas — también programados\n🎬 Las películas de Disney/Pixar — efectos especiales con código\n💰 Los programadores ganan muy bien en todo el mundo\n\n**Lo más increíble:** con lo que aprendes en ByteKids, cuando tengas 16-17 años podrías **crear tu propio videojuego** y venderlo.\n\n¿Hay algún videojuego o app que te gustaría poder crear tú mismo algún día? 🚀'
    },
    {
      keywords: ['operador', 'comparar', 'igual', 'mayor', 'menor', 'booleano', 'true', 'false'],
      reply: '¡Los operadores son los símbolos con los que el código toma decisiones! ⚖️\n\n```python\n# Operadores de comparación (siempre dan True o False)\n10 == 10   # True  — igual a\n10 != 5    # True  — diferente de\n10 > 7     # True  — mayor que\n10 < 7     # False — menor que\n10 >= 10   # True  — mayor o igual\n10 <= 9    # False — menor o igual\n\n# Operadores lógicos\nTrue and True   # True  — ambos deben ser True\nTrue or False   # True  — al menos uno debe ser True\nnot True        # False — invierte\n\n# Ejemplo real:\npuntos = 850\nes_ganador = puntos > 800 and puntos < 1000\nprint(es_ganador)  # True\n```\n\n¿Tienes un ejercicio específico con operadores? 🔍'
    },
    {
      keywords: ['consola', 'terminal', 'ejecutar', 'correr', 'run'],
      reply: '¡La consola/terminal es donde los programas cobran vida! ⚡\n\n**¿Cómo ejecutar un programa Python?**\n\n```bash\n# En la terminal/consola escribe:\npython mi_programa.py\n\n# O en algunos sistemas:\npython3 mi_programa.py\n```\n\n**Atajos útiles:**\n- `Ctrl + C` → Detener un programa que está corriendo\n- ⬆️ Flecha arriba → Repetir el último comando\n- `clear` → Limpiar la pantalla de la consola\n\n**En Roblox Studio:**\nEl output (consola) está en `View → Output` y ahí ves tus `print()` ✅\n\n¿Estás usando algún editor específico? Te ayudo a configurarlo 🛠️'
    },
  ];

  private defaultStudentReplies = [
    '¡Buena pregunta! 🤔 Vamos paso a paso.\n\nDime un poco más sobre qué parte exactamente te confunde y te explico con un ejemplo concreto. ¡No hay preguntas tontas aquí! 💪',
    '¡Me encanta que preguntes! 🌟 Para darte la mejor explicación, cuéntame:\n\n- ¿Estás trabajando en Python, Scratch, HTML o Roblox?\n- ¿Hay algún código que ya intentaste?\n\n¡Juntos lo resolvemos! 🤝',
    'Interesante. 🧠 Déjame pensar cómo explicártelo de la manera más clara...\n\n¿Puedes darme más contexto sobre lo que estás intentando hacer? Así puedo darte un ejemplo que tenga sentido para ti específicamente. 🎯',
    '¡Perfecto que preguntes antes de frustrarte! 😊\n\nEsa es la actitud correcta de un buen programador. Cuéntame más sobre qué estás intentando lograr y en qué parte te trabaste. ¡Te ayudo ahora mismo! 🚀',
  ];

  private teacherReplies: Record<string, string> = {
    default: '¡Excelente consulta pedagógica! 📚 Puedo ayudarte a diseñar actividades, analizar progreso o crear recursos. ¿Qué necesitas específicamente?',
    plan: '📋 **Plan de clase — Python básico (45 min)**\n\n**Objetivo:** Entender variables y tipos de datos\n\n**1. Apertura (5 min)**\n- Pregunta detonadora: "¿Qué guardarías en una caja mágica?"\n\n**2. Desarrollo (30 min)**\n- Demo: crear variables en pantalla\n- Actividad gamificada: cada alumno crea sus propias variables\n- Reto: programa que salude por nombre\n\n**3. Cierre (10 min)**\n- Reflexión: ¿Para qué sirven las variables en la vida real?\n- Tarea: crear 3 variables sobre tu familia\n\n¿Quieres que adapte esto para otro grado o tema?',
    rubrica: '📝 **Rúbrica de evaluación — Programación básica**\n\n| Criterio | Excelente (4) | Bueno (3) | Suficiente (2) | Insuficiente (1) |\n|---|---|---|---|---|\n| Sintaxis | Sin errores | 1-2 errores menores | 3-4 errores | Muchos errores |\n| Lógica | Solución óptima | Funciona correctamente | Funciona parcialmente | No funciona |\n| Creatividad | Solución original | Algo creativo | Sigue el ejemplo | Copia exacta |\n| Comentarios | Todos comentados | Mayoría comentados | Algunos comentarios | Sin comentarios |\n\n¿Ajusto algún criterio o nivel de dificultad?',
    rezago: '⚠️ **Estrategia para alumnos en rezago:**\n\n1. **Diagnóstico rápido** — Identifica si el problema es comprensión, motivación o técnico\n2. **Actividades diferenciadas** — Asigna misiones de nivel anterior para reforzar base\n3. **Tutor IA personalizado** — ByteBot puede dar atención 1:1 fuera del horario\n4. **Comunicación con padres** — Comparte el reporte semanal con sugerencias en casa\n5. **Retos pequeños** — Tareas cortas de 10 min para recuperar confianza\n\n¿Cuántos alumnos tienen esta situación en tu salón?',
    proyecto: '💻 **Ideas de proyectos por materia:**\n\n🐍 **Python:** Calculadora de calificaciones, juego de adivinanzas\n🌐 **HTML/CSS:** Página de presentación personal, blog de clase\n🧩 **Scratch:** Juego de plataformas, historia animada\n🤖 **Robótica:** Sensor de luz con LED, brazo robot de cartón\n🎮 **Roblox Studio:** Mundo temático de su ciudad/escuela\n\n¿Para qué materia y grado necesitas el proyecto?',
  };

  private parentReplies: Record<string, string> = {
    default: '¡Hola! 💙 Estoy aquí para ayudarte a entender el progreso de tu hijo/a y apoyarlo en casa. ¿Qué te gustaría saber?',
    progreso: '📊 **¿Qué significa el progreso del 78%?**\n\nSignifica que tu hijo/a ha completado el 78% de las actividades asignadas este período. ¡Es un avance muy bueno! 🌟\n\n**Para seguir mejorando:**\n• Reserva 20 min al día para practicar\n• Pregúntale qué aprendió hoy\n• Celebra cada logro, por pequeño que sea\n\n¿Quieres ver en qué materia específica necesita más apoyo?',
    motivar: '💪 **Cómo motivar a tu hijo/a:**\n\n1. **Conecta con sus intereses** — ¿Le gustan los videojuegos? ¡Roblox Studio los convierte en creadores!\n2. **Rutina fija** — 20 minutos después de la comida, sin teléfono\n3. **Celebra pequeños logros** — Cada misión completada merece un "¡bravo!"\n4. **Programa juntos** — Pídele que te explique lo que está aprendiendo\n5. **Retos familiares** — Hagan un mini-proyecto juntos el fin de semana',
    python: '🐍 **¿Qué es Python?**\n\nPython es uno de los lenguajes de programación más populares del mundo. Con Python tu hijo/a puede crear videojuegos, hacer cálculos matemáticos y construir páginas web.\n\n**Empresas como Google, Netflix e Instagram usan Python.** ¡Tu hijo/a está aprendiendo una habilidad del futuro!',
    roblox: '🎮 **¿Roblox Studio es educativo?**\n\n¡Absolutamente! Roblox Studio no es solo jugar — es **crear** videojuegos usando Lua, un lenguaje de programación real.\n\nTu hijo/a aprende: Programación, Diseño 3D, Matemáticas aplicadas y Trabajo en equipo. ¡Muchos jóvenes generan ingresos reales publicando sus juegos en Roblox!',
  };

  private adminReplies: Record<string, string> = {
    default: '📊 Analizando los datos disponibles... ¿Qué aspecto institucional deseas revisar? Puedo generar reportes de rendimiento, identificar tendencias o diseñar estrategias de mejora.',
    reporte: '📄 **REPORTE EJECUTIVO — ByteKids Academy**\n_Período: Abril 2026_\n\n**RESUMEN EJECUTIVO**\nLa institución muestra un crecimiento sólido con 85 alumnos activos (+12 este mes). El promedio escolar de 76% supera el objetivo trimestral del 72%.\n\n**INDICADORES CLAVE**\n✅ Alumnos activos: 85 (+16%)\n✅ Promedio escolar: 76% (+5pp)\n✅ Misiones completadas: 1,840 esta semana\n⚠️ Salón 5°A requiere intervención: 62% promedio\n\n**RECOMENDACIONES**\n1. Reforzar 5°A con sesiones de tutoría adicionales\n2. Replicar metodología de 2°A (88%) en otros grupos\n3. Aumentar uso del Tutor IA en horario extraescolar',
    rezago: '⚠️ **Análisis de salones en riesgo:**\n\n🔴 **5°A — Atención urgente (62%)**\n- Materias más afectadas: Python (-18%), Robótica (-22%)\n- Acción recomendada: Sesión de nivelación + revisión metodológica\n\n🟡 **4°A — Seguimiento (70%)**\n- Tendencia positiva +5% — mantener estrategia actual\n\n🟢 **2°A, 3°B — Excelente (88%, 82%)**\n- Compartir buenas prácticas con otros docentes',
    expansion: '🌎 **Estrategia de expansión — México**\n\n**Fase 1 (Ya lista):** Plataforma funcional con 4 roles\n**Fase 2 (3 meses):** Piloto con 5 escuelas públicas CDMX\n**Fase 3 (6 meses):** Convenio con SEP para programa estatal\n**Fase 4 (12 meses):** 100 escuelas en CDMX, Jalisco, Nuevo León',
  };

  private studentDefaultIndex = 0;

  private getBestStudentReply(input: string): string {
    const lower = input.toLowerCase();
    for (const entry of this.studentReplies) {
      if (entry.keywords.some(k => lower.includes(k))) {
        return entry.reply;
      }
    }
    const reply = this.defaultStudentReplies[this.studentDefaultIndex % this.defaultStudentReplies.length];
    this.studentDefaultIndex++;
    return reply;
  }

  private getBestReply(input: string, replies: Record<string, string>): string {
    const lower = input.toLowerCase();
    const keys = Object.keys(replies).filter(k => k !== 'default');
    for (const key of keys) {
      if (lower.includes(key)) return replies[key];
    }
    if (lower.includes('plan') || lower.includes('clase')) return replies['plan'] ?? replies['default'];
    if (lower.includes('progreso') || lower.includes('%')) return replies['progreso'] ?? replies['default'];
    if (lower.includes('reporte') || lower.includes('ejecutivo')) return replies['reporte'] ?? replies['default'];
    if (lower.includes('rezago') || lower.includes('riesgo')) return replies['rezago'] ?? replies['default'];
    if (lower.includes('motiv')) return replies['motivar'] ?? replies['default'];
    if (lower.includes('roblox')) return replies['roblox'] ?? replies['default'];
    if (lower.includes('python')) return replies['python'] ?? replies['default'];
    if (lower.includes('expan')) return replies['expansion'] ?? replies['default'];
    if (lower.includes('proyecto')) return replies['proyecto'] ?? replies['default'];
    if (lower.includes('rúbrica') || lower.includes('evaluac')) return replies['rubrica'] ?? replies['default'];
    return replies['default'];
  }

  async sendMessage(messages: ChatMessage[], role: TutorRole, userMessage: string): Promise<string> {
    await new Promise(r => setTimeout(r, 700 + Math.random() * 800));
    switch (role) {
      case 'student': return this.getBestStudentReply(userMessage);
      case 'teacher': return this.getBestReply(userMessage, this.teacherReplies);
      case 'parent':  return this.getBestReply(userMessage, this.parentReplies);
      case 'admin':   return this.getBestReply(userMessage, this.adminReplies);
      default: return '¡Hola! ¿En qué puedo ayudarte?';
    }
  }
}
