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

    public function __construct(array $data, array $dataCostCash, array $dataCategory, array $dataOwner, array $dataDirectorateTrend = [])
    {
        Log::info("DashboardUpdated");

        $this->data = $data;
        $this->dataCostCash = $dataCostCash;
        $this->dataCategory = $dataCategory;
        $this->dataOwner = $dataOwner;
        $this->dataDirectorateTrend = $dataDirectorateTrend;
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
            'dataCostCash' => $this->dataCostCash,
            'dataCategory' => $this->dataCategory,
            'dataOwner' => $this->dataOwner,
            'dataDirectorateTrend' => $this->dataDirectorateTrend,
        ];
    }
}

