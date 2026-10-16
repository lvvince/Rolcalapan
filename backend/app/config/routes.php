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
// Login
$router->post('/api/auth/login', 'AuthController::login');
// Current logged-in user
$router->get('/api/auth/me', 'AuthController::me');
// Member registration
$router->post('/api/auth/register', 'AuthController::register');
// Email verification
$router->get('/api/auth/verify-email', 'AuthController::verify_email');
// Forgot password
$router->post('/api/auth/forgot', 'AuthController::forgot');
// Reset password
$router->post('/api/auth/reset', 'AuthController::reset');
/*
|--------------------------------------------------------------------------
| ADMIN / PASTOR
|--------------------------------------------------------------------------
*/
$router->get('/api/admin/stats', 'AdminController::stats');
$router->get('/api/admin/users', 'AdminController::users_list');
$router->post('/api/admin/users/save', 'AdminController::user_save');
$router->post('/api/admin/users/delete', 'AdminController::user_delete');
/*
|--------------------------------------------------------------------------
| CHATBOT
|--------------------------------------------------------------------------
*/
$router->post('/api/chatbot/ask', 'ChatbotController::ask');
$router->get('/api/chatbot/kb', 'ChatbotController::kb_list');
$router->post('/api/chatbot/kb', 'ChatbotController::kb_save');
$router->post('/api/chatbot/kb/delete', 'ChatbotController::kb_delete');
/*
|--------------------------------------------------------------------------
| GENERIC RESOURCE
|--------------------------------------------------------------------------
*/
$router->get('/api/resource', 'ResourceController::index');
$router->post('/api/resource/save', 'ResourceController::save');
$router->post('/api/resource/delete', 'ResourceController::delete');
/*
|--------------------------------------------------------------------------
| PORTAL
|--------------------------------------------------------------------------
*/
// Member profile
$router->get('/api/portal/me', 'PortalController::me');
$router->post('/api/portal/me', 'PortalController::me_update');
// Dashboard overview
$router->get('/api/portal/overview', 'PortalController::overview');
// Ministries
$router->get('/api/portal/ministries', 'PortalController::ministries');
$router->post('/api/portal/join', 'PortalController::join');
$router->post('/api/portal/leave', 'PortalController::leave');
$router->get('/api/portal/recommended', 'PortalController::recommended');
// Attendance (QR / code check-in, ginagamit din ng camera scanner)
$router->post('/api/portal/checkin', 'PortalController::checkin');
// Reports
$router->get('/api/portal/reports', 'PortalController::reports');
// Notifications
$router->get('/api/portal/notifications', 'PortalController::my_notifications');