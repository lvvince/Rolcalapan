<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');
/**
 * ------------------------------------------------------------------
 * LavaLust - an opensource lightweight PHP MVC Framework
 * ------------------------------------------------------------------
 *
 * MIT License
 *
 * Copyright (c) 2020 Ronald M. Marasigan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @package LavaLust
 * @author Ronald M. Marasigan <ronald.marasigan@yahoo.com>
 * @since Version 1
 * @link https://github.com/ronmarasigan/LavaLust
 * @license https://opensource.org/licenses/MIT MIT License
 */

/*
| -------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------
| Here is where you can register web routes for your application.
|
|
*/
/** @var object $router **/

/*
|--------------------------------------------------------------------------
| WELCOME PAGE
|--------------------------------------------------------------------------
*/
$router->get('/', 'Welcome::index');

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/
$router->post('/api/auth/login',        'AuthController::login');
$router->post('/api/auth/refresh',      'AuthController::refresh');   // remember-me cookie -> bagong JWT
$router->post('/api/auth/logout',       'AuthController::logout');    // burahin ang remember-me token + cookie
$router->get( '/api/auth/me',           'AuthController::me');
$router->post('/api/auth/register',     'AuthController::register');

// Email verification gamit ang 6-digit code (walang link)
$router->post('/api/auth/verify-code',  'AuthController::verify_code');
$router->post('/api/auth/resend-code',  'AuthController::resend_code');

$router->post('/api/auth/forgot',       'AuthController::forgot');
$router->post('/api/auth/reset',        'AuthController::reset');

// My Profile (admin / lahat ng roles): update info, change password, photo
$router->put(   '/api/auth/me',          'AuthController::update_me');
$router->put(   '/api/auth/me/password', 'AuthController::change_password');
$router->post(  '/api/auth/me/photo',    'AuthController::upload_photo');
$router->delete('/api/auth/me/photo',    'AuthController::remove_photo');
$router->get('/api/avatar', 'AuthController::avatar');

/*
|--------------------------------------------------------------------------
| ADMIN / PASTOR
|--------------------------------------------------------------------------
*/
$router->get( '/api/admin/stats',        'AdminController::stats');
$router->get( '/api/admin/users',        'AdminController::users_list');
$router->post('/api/admin/users/save',   'AdminController::user_save');
$router->post('/api/admin/users/delete', 'AdminController::user_delete');

/*
|--------------------------------------------------------------------------
| GENERIC RESOURCE (members, ministries, events, giving, etc.)
|--------------------------------------------------------------------------
| GET  /api/resource?name=ministries
| POST /api/resource/save    {resource: 'ministries', id?, ...fields}
| POST /api/resource/delete  {resource: 'ministries', id}
*/
$router->get( '/api/resource',        'ResourceController::index');
$router->post('/api/resource/save',   'ResourceController::save');
$router->post('/api/resource/delete', 'ResourceController::delete');

/*
|--------------------------------------------------------------------------
| CHATBOT (floating widget lang)
|--------------------------------------------------------------------------
| Inalis na ang admin KB routes (/api/chatbot/*).
| Naiwan ang /api/chat dahil ginagamit pa ng floating ChatWidget.
*/
$router->post('/api/chat', 'ChatbotController::ask');

/*
|--------------------------------------------------------------------------
| AUTO-TRANSLATE (tl, ceb, ilo)
|--------------------------------------------------------------------------
*/
$router->post('/api/translate', 'TranslateController::batch');

/*
|--------------------------------------------------------------------------
| DAILY BIBLE VERSE (public, ginagamit ng lahat ng portal)
|--------------------------------------------------------------------------
| GET /api/verse/daily?portal=admin|secretary|leader|member|home
*/
$router->get('/api/verse/daily', 'VerseController::daily');

/*
|--------------------------------------------------------------------------
| PORTAL (Member / Congregant)
|--------------------------------------------------------------------------
*/
// Profile
$router->get( '/api/portal/me',         'PortalController::me');
$router->post('/api/portal/me',         'PortalController::me_update');
$router->post('/api/portal/me/picture', 'PortalController::me_picture');

// Dashboard overview
$router->get('/api/portal/overview', 'PortalController::overview');

// Ministries
$router->get( '/api/portal/ministries',   'PortalController::ministries');
$router->post('/api/portal/join',         'PortalController::join');
$router->post('/api/portal/leave',        'PortalController::leave');
$router->get( '/api/portal/recommended',  'PortalController::recommended');

// Interests ng member (para sa Recommended)
$router->get( '/api/portal/interests', 'PortalController::interests');
$router->post('/api/portal/interests', 'PortalController::interests_save');

// Tags at age range ng ministry (Admin at Ministry Leader)
$router->get( '/api/portal/ministry-details', 'PortalController::ministry_details');
$router->post('/api/portal/ministry-details', 'PortalController::ministry_details_save');

// Magdagdag ng ministry / small group (Ministry Leader at Admin)
$router->post('/api/portal/ministry-save', 'PortalController::ministry_save');

// Attendance (QR / code check-in, ginagamit din ng camera scanner)
$router->post('/api/portal/checkin', 'PortalController::checkin');

// Reports
$router->get('/api/portal/reports', 'PortalController::reports');

// Notifications
$router->get('/api/portal/notifications', 'PortalController::my_notifications');