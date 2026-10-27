VERTICE - LA AVENTURA DE LOS 13 NUMEROS  (version 3 - etapa 2: diseno, animaciones y musica)

1. Descomprime la carpeta vertice-minijuego.
2. Abre esa carpeta en VS Code (File > Open Folder).
3. El logo ya esta en img/logo.png (version ligera de 192 px).
4. Abre index.html con la extension Live Server (clic derecho > Open with Live Server).

REGLAS (todas ajustables al inicio de script.js, seccion 2):
- 8 preguntas de 15 s: 5 puntos cada una (max 40).
- Desafio final de 20 s: cada acierto suma, cada trampa resta el doble (max 60).
- Los 13 numeros a recordar son los que aparecen como respuestas A, B, C, D.

IMPORTANTE: el formulario sigue siendo una maqueta local. No envia ni guarda datos.

AUDIO (audio.js):
- La musica y los efectos se generan con codigo (no hay archivos de audio, no hay derechos de autor).
- El sonido arranca con el primer toque en "Vamos al reto" (los celulares no permiten sonido automatico).
- El boton redondo de arriba a la derecha silencia o reactiva todo; la preferencia se recuerda.
- Volumen: cambia MUSIC_LEVEL y SFX_LEVEL cerca del inicio del bloque "Estado y control" de audio.js.
- En iPhone, si el interruptor lateral de silencio esta activado, no se oye el audio web.
