(function () {
    'use strict';

    function render(target) {
        if (!target) return;
        var root = document.body.dataset.siteRoot || './';
        var link = function (file) { return root + file; };

        target.innerHTML =
            '<footer class="site-footer no-print">' +
                '<div class="site-footer-inner">' +
                    '<span class="site-footer-brand">FJ Gestiones · Herramientas y guías</span>' +
                    '<div class="site-footer-links">' +
                        '<a href="' + link('index.html') + '">Inicio</a>' +
                        '<a href="' + link('blog-index.html') + '">Blog</a>' +
                        '<a href="' + link('presupuesto.html') + '">Presupuesto</a>' +
                        '<a href="' + link('sobre-mi.html') + '">Sobre mí</a>' +
                        '<span>Horario de atención habitual: de lunes a domingo de 8:00–14:00</span>' +
                        '<a href="' + link('contacto.html') + '">Contacto</a>' +
                        '<a href="' + link('rgpd.html') + '">RGPD</a>' +
                    '</div>' +
                '</div>' +
            '</footer>';
    }

    window.FJFooter = { render: render };
    render(document.getElementById('site-footer'));
})();
