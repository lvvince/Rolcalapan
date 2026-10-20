<?php

class KnowledgeModel extends Model
{
    public function __construct()
    {
        parent::__construct();
    }

    public function get_active()
    {
        return $this->db->table('knowledge_base')->where('is_active', 1)->get_all();
    }

    public function log_chat($data)
    {
        return $this->db->table('chat_logs')->insert($data);
    }
}