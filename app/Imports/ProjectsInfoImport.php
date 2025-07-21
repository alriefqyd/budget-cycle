<?php

namespace App\Imports;


use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithUpserts;

class ProjectsInfoImport implements ToModel, WithMapping, WithStartRow, WithBatchInserts, WithUpserts,
    WithChunkReading, WithEvents
{
    /**
    * @param Collection $collection
    */
    public function collection(Collection $collection)
    {
        //
    }

    public function model(array $row)
    {
        // TODO: Implement model() method.
    }

    public function batchSize(): int
    {
        // TODO: Implement batchSize() method.
    }

    public function chunkSize(): int
    {
        // TODO: Implement chunkSize() method.
    }

    public function registerEvents(): array
    {
        // TODO: Implement registerEvents() method.
    }

    public function map($row): array
    {
        // TODO: Implement map() method.
    }

    public function startRow(): int
    {
        // TODO: Implement startRow() method.
    }

    public function uniqueBy()
    {
        // TODO: Implement uniqueBy() method.
    }
}
