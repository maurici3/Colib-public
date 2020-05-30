const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../models/User');
const User = mongoose.model('users');
const validateRegister = require('../controller/validateRegister');
const bctypt = require('bcryptjs');
const passport = require('passport');
require('../models/Post');
const Post = mongoose.model('posts');
require('../models/Book');
const Book = mongoose.model('books');
const validatePost = require('../controller/validatePost');
const validateBook = require('../controller/validateBook');
const returnFile = require('../controller/returnFile');
const deleteFile = require('../controller/deleteFile');
const filterHashtags = require('../controller/filterHashtags');
const returnSlug = require('../controller/returnSlug');
const returnMetaDescription = require('../controller/returnMetaDescription');
const filterFileName =  require('../controller/filterFileName');
const {isUser} = require('../helpers/isUser.js');
// Login e Registro
    router.get('/login', (req, res) => {
        res.render('user/login');
    });

    router.post('/login', (req, res, next) => {
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/user/login',
            failureFlash: true
        })(req, res, next);
    });

    router.get('/logout', (req, res) => {
        req.logOut();
        req.flash('success_msg', 'Logout realizado com sucesso!');
        res.redirect('/');
    });
    
    router.post('/login/register', (req, res) => {

        var errors = validateRegister(req.body);

        if(errors.length > 0){
            req.flash('error_msg', errors); 
            res.redirect('/user/login');
        } else { 
            var errorsUnique = [];
            User.findOne({email: req.body.register_email}).then((email) => {
                User.findOne({nickname: req.body.register_nickname}).then((nickname) => {
                    if(email){
                        errorsUnique.push({text: 'O e-mail '+email.email+' já foi cadastrado, por favor, escolha outro.'});
                    }
                    if(nickname){
                        errorsUnique.push({text: 'Alguém já está utilizando o apelido '+nickname.nickname+', por favor, escolha outro.'});
                    }
                    if(errorsUnique.length > 0){
                        req.flash('error_msg', errorsUnique);
                        res.redirect('/user/login');
                    } else {
                        const newUser = {
                            name: req.body.register_name,
                            nickname: req.body.register_nickname,
                            email: req.body.register_email,
                            password: req.body.register_password
                        }

                        bctypt.genSalt(10, (error, salt) => {
                            bctypt.hash(newUser.password, salt, (error, hash) => {
                                if(error){
                                    req.flash('error_msg', 'Houve um erro durante o salvamento de seus dados, por favor, tente novamente');
                                    res.redirect('/user/login');
                                } else {
                                   newUser.password = hash;
                                   new User(newUser).save().then(() => {
                                        req.flash('success_msg', 'Cadastro realizado com sucesso!');
                                        res.redirect('/user/login');
                                    }).catch((err) => {
                                        req.flash('error_msg', 'Houve um erro interno, tente novamente.'+err);
                                        res.redirect('/user/login');
                                    });
                                }
                            });
                        });
                    }
                }).catch((err) => {
                    req.flash(('error_msg', 'Houve um erro interno, por favor, tente novamente.'));
                    res.redirect('/user/login');
                });
            }).catch((err) => {
                req.flash(('error_msg', 'Houve um erro interno, por favor, tente novamente.'));
                res.redirect('/user/login');
            });
        }
    });
// Telas do painel de Usuário

    // Multer - Upload de arquivos
        const path = require('path');
        const multer = require('multer');

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                if(path.extname(file.originalname) == '.jpg' || path.extname(file.originalname) == '.png'){
                    if(req.body.name){
                        // Se for livro
                        cb(null, 'public/uploads/images'); 
                    } else if(req.body.title){
                        // Se for artigo
                        cb(null, 'public/uploads/images/thumbnails'); 
                    }
                } else {
                    cb(null, 'public/uploads/files');
                }   
            },
            filename: (req, file, cb) => {
                if(req.body.name){
                    // Se for livro
                    var nameBook = filterFileName(req.body.name);
                    cb(null, nameBook+'-'+Date.now()+path.extname(file.originalname));
                } else if(req.body.title){
                    // Se for artigo
                    var nameCover = filterFileName(req.body.title);
                    cb(null, nameCover+'-'+Date.now()+path.extname(file.originalname));
                }
            }
        }); 
        const upload = multer({storage});
    // Home
        router.get('/', isUser, (req, res) => {
            res.redirect('/user/library'); 
        });
    // Biblioteca
        router.get('/library', isUser, (req, res) => {
            Book.find({user: res.locals.user.nickname}).sort({date: 'desc'}).then((books) => {
                res.render('user/library', {books: books.map(book => book.toJSON())}); 
            }).catch((err) =>{
                req.flash('error_msg', 'Houve um erro ao listar os livros, por favor, tente novamente.'); 
            }); 
        });
        router.get('/library/new-file', isUser, (req, res) => {
            res.render('user/library-add');  
        });
        router.post('/library/add', isUser, upload.any('files'),(req, res) => { 
            // Verificando quais arquivos foram enviados
            var filesToValidade = [];
            var pdf = returnFile(req.files, 'pdf');
            var epub = returnFile(req.files, 'epub');
            var mobi = returnFile(req.files, 'mobi');  
            var cover = returnFile(req.files, 'img'); 
            filesToValidade.push(pdf,epub,mobi);
            // Fim verificando quais arquivos foram enviados
            
            // Separando as Hashtags dentro de um array
            var tags = filterHashtags(req.body.hashtags);
            var slug = returnSlug(req.body.name);
            var errors = validateBook(req.body, cover, filesToValidade, true);
            
            if(errors.length > 0){
                req.flash('error_msg', errors); 
                res.redirect('/user/library/new-file/'); 
            } else {
            // Criando objeto Livro
                const newBook = {
                    name: req.body.name,
                    slug: slug,
                    author: req.body.author,
                    hashtags: tags,
                    description: req.body.description,
                    cover: cover, 
                    file_pdf: pdf, 
                    file_epub: epub,
                    file_mobi: mobi,
                    user: res.locals.user.nickname
                }
                new Book(newBook).save().then(() => {
                    req.flash('success_msg', 'Livro cadastrado com sucesso!');
                    res.redirect('/user/library');
                }).catch((err) => {
                    req.flash('error_msg', 'Houve um erro cadastrar o livro, tente novamente.');
                    res.redirect('/user/library/new-file');
                });
            }
        });

        router.get('/library/edit/:id', isUser, (req, res) => {
            Book.findOne({_id:req.params.id, user:res.locals.user.nickname}).lean().then((book) => {
                if(book){
                    res.render('user/library-edit', {book: book}); 
                } else {
                    res.redirect('/user/library/new-file');
                }
            }).catch((err) => {
                req.flash('error_msg', 'Este livro não existe');
                res.redirect('/user/library/');
            });
            
        }); 

        router.post('/library/edit', isUser, upload.any('files'), (req, res) => {

            var filesToValidade = [];
            var pdf = returnFile(req.files, 'pdf');
            var epub = returnFile(req.files, 'epub');
            var mobi = returnFile(req.files, 'mobi');  
            var cover = returnFile(req.files, 'img'); 
            if(pdf != undefined || epub != undefined || mobi != undefined){
                filesToValidade.push(pdf,epub,mobi);
            }
            // Separando as Hashtags dentro de um array
            var tags = filterHashtags(req.body.hashtags);

            var errors = validateBook(req.body, cover, filesToValidade, false); 

            if(errors.length > 0){
                req.flash('error_msg', errors); 
                res.redirect('/user/library/edit/'+req.body.id);
            } else {
                Book.findOne({_id:req.body.id}).then((book) => {
                    book.name = req.body.name;
                    book.author = req.body.author;
                    book.hashtags = tags;
                    book.description = req.body.description; 
                    if(cover){
                        // Deletando arquivo antigo antes de atruibuir novo valor na base de dados
                        deleteFile(book.cover); 
                        book.cover = cover;
                    }
                    if(pdf){
                        deleteFile(book.file_pdf); 
                        book.file_pdf = pdf;
                    }
                    if(epub){
                        deleteFile(book.file_epub); 
                        book.file_epub = epub;
                    }
                    if(mobi){
                        deleteFile(book.file_mobi); 
                        book.file_mobi = mobi;
                    }
                    book.save().then(() => {
                        req.flash('success_msg', 'Livro editado com sucesso!');
                        res.redirect('/user/library/edit/'+req.body.id);
                    }).catch((err) => {
                        req.flash('error_msg', 'Houve um erro interno ao editar o livro');
                        res.redirect('/user/library/edit'+req.body.id);
                    });
                }).catch((err) => {
                    req.flash('error_msg', 'Houve um erro ao editar o livro');
                    res.redirect('/user/library');
                });
            }
        });

        router.post('/library/delete', isUser, (req, res) => {
            Book.findOne({_id:req.body.id, user:res.locals.user.nickname}).then((book) => {
                if(book){
                    // deletando arquivos de uploads
                    deleteFile(book.cover); 
                    deleteFile(book.file_pdf);  
                    deleteFile(book.file_epub); 
                    deleteFile(book.file_mobi); 
                    Book.remove({_id: req.body.id}).then(() => {
                        req.flash('success_msg', 'Livro excluído com sucesso!');
                        res.redirect('/user/library/');
                    }).catch((err) => {
                        req.flash('error_msg', 'Houve um erro ao excluir o livro');
                        res.redirect('/user/library/');
                    }); 
                } else {
                    res.redirect('/user/library');
                }
            }).catch(() => {
                req.flash('error_msg', 'Houve um erro ao excluir o os arquivos');
                res.redirect('/user/library/');
            });
        });
    // Posts
        router.get('/articles', isUser, (req, res) => { 
            Post.find().then((posts) => {
                res.render('user/articles', {posts: posts.map(post => post.toJSON())}); 
            }).catch((err) =>{
                req.flash('error_msg', 'Houve um erro ao listar os artigos.'); 
            });  
        });

        router.get('/articles/new-article', isUser, (req, res) => {
            res.render('user/articles-add');  
        });

        router.post('/articles/add', isUser, upload.any('files'), (req, res) => {
            var thumbnail = returnFile(req.files, 'img', 'thumbnails'); 
            var slug = returnSlug(req.body.title);
            var metadescription = returnMetaDescription(req.body.content);
            var tags = filterHashtags(req.body.hashtags);

            var errors = validatePost(req.body, thumbnail, false);

            if(errors.length > 0){
                req.flash('error_msg', errors); 
                res.redirect('/user/articles/new-article/');
            } else { 
                const newPost = {
                    title: req.body.title,
                    slug: slug,
                    hashtags: tags,
                    thumbnail: thumbnail,
                    description: metadescription,
                    content: req.body.content
                }
                new Post(newPost).save().then(() => {
                    req.flash('success_msg', 'Artigo criado com sucesso!');
                    res.redirect('/user/articles');
                }).catch((err) => {
                    req.flash('error_msg', 'Houve um erro ao salvar o artigo, tente novamente.'+err);
                    res.redirect('/user/articles/new-article');
                });
            }
        });

        router.get('/article/edit/:id', isUser, (req, res) => {
            Post.findOne({_id:req.params.id}).lean().then((post) => {
                res.render('user/articles-edit', {post: post}); 
            }).catch((err) => {
                req.flash('error_msg', 'Este artigo não existe');
                res.redirect('/user/articles/');
            });
            
        }); 

        router.post('/articles/edit', isUser, upload.any('files'), (req, res) => {
            var thumbnail = returnFile(req.files, 'img', 'thumbnails'); 
            var slug = returnSlug(req.body.title);
            var metadescription = returnMetaDescription(req.body.content);
            var tags = filterHashtags(req.body.hashtags);

            var errors = validatePost(req.body, thumbnail, false);
            if(errors.length > 0){
                req.flash('error_msg', errors); 
                res.redirect('/user/articles/edit/'+req.body.id);
            } else {
                Post.findOne({_id:req.body.id}).then((post) => {
                    post.title = req.body.title;
                    post.slug = slug;
                    post.hashtags = tags;
                    if(thumbnail != null && thumbnail != undefined && thumbnail != ''){
                        // Deletando arquivo antigo antes de atruibuir novo valor na base de dados
                        deleteFile(post.thumbnail); 
                        post.thumbnail = thumbnail;
                    }
                    post.description = metadescription;
                    post.content = req.body.content;
                    post.save().then(() => {
                        req.flash('success_msg', 'Artigo editado com sucesso!');
                        res.redirect('/user/articles');
                    }).catch((err) => {
                        req.flash('error_msg', 'Houve um erro interno ao salvar o artigo');
                        res.redirect('/user/articles');
                    });
                }).catch((err) => {
                    req.flash('error_msg', 'Houve um erro ao editar o artigo');
                    res.redirect('/user/articles');
                });
            }
        });

        router.post('/articles/delete', isUser, (req, res) => {
            Post.findOne({_id:req.body.id}).then((post) => {
                // deletando arquivos de uploads
                deleteFile(post.thumbnail); 
                Post.remove({_id: req.body.id}).then(() => {
                    req.flash('success_msg', 'Artigo excluído com sucesso!');
                    res.redirect('/user/articles/');
                }).catch((err) => {
                    req.flash('error_msg', 'Houve um erro ao excluir o artigo');
                    res.redirect('/user/articles/');
                }); 
            }).catch((err) => {
                req.flash('error_msg', 'Houve um erro ao excluir o artigo');
                res.redirect('/user/articles/');
            });
        });
    // Mídias
        router.get('/medias', isUser, (req, res) => {
            res.render('user/medias'); 
        });
    // Configurações
        router.get('/settings', isUser, (req, res) => {
            res.render('user/settings'); 
        });


module.exports = router;