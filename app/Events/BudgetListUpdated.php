<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BudgetListUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public array $data;
    public function __construct(array $data)
    {
        Log::info('event updated budget list data');
        $this->data = $data;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('budgetList')
        ];
    }

    public function broadcastAs(): string
    {
        return 'budgetList.update';
    }

    public function broadcastWith(): array
    {
        Log::info('event broadcast budget list data');
        return [
            'data' => $this->data
        ];
    }

}
