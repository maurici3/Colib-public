window.onload = function(){ 
    // Obter nome do arquivo library
    var checkIfLib =  document.querySelector('.form-add.library');
    if (typeof(checkIfLib) != 'undefined' && checkIfLib != null){
        document.querySelector('.form-add.library #cover').addEventListener('change', function(){
            var fileName = this.value.split('\\').pop();
            this.parentElement.dataset.fileName = fileName;
        });
        document.querySelectorAll('.form-add.library input').forEach(item => {
            item.addEventListener('change', function(){
                var fileName = this.value.split('\\').pop();
                this.parentElement.dataset.fileName = fileName;
            });
        });
    }

    // Passar dados do formulário para o Textarea oculto do artigo
    var checkIfPost =  document.querySelector('.form-add.article');
    if (typeof(checkIfPost) != 'undefined' && checkIfPost != null){
        document.querySelector('form button.style-button').addEventListener('click', function(){
            var getTextPost = document.querySelector('form .ql-editor').innerHTML;
            document.querySelector('form textarea').innerHTML = getTextPost;
        });

        // Obter nome da capa no artigo
        document.querySelector('.form-add.article #cover').addEventListener('change', function(){
            var fileName = this.value.split('\\').pop();
            this.parentElement.dataset.fileName = fileName;
        });

        // Mover conteúdo do text para dentro do bloco de edição
        var getTextArticle = document.querySelector('#content').innerHTML;
    }
}