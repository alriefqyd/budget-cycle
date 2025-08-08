<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Support\Facades\Log;

class DashboardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $data;
    public array $dataCostCash;

    public function __construct(array $data, array $dataCostCash)
    {
        Log::info("DashboardUpdated");

        $this->data = $data;
        $this->dataCostCash = $dataCostCash;
    }

    public function broadcastOn(): array
    {
        Log::info('📡 Broadcasting on channel: dashboard');
        return [new Channel('dashboard')];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.update';
    }

    public function broadcastWith(): array
    {
        return [
            'data' => $this->data,
            'dataCostCash' => $this->dataCostCash
        ];
    }
}

