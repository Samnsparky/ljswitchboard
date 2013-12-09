import csv
import sys

USAGE_STR = 'python all_metrics_to_json.py names_adj_matrix_csv ' \
            'addr_adj_matrix_csv answers_loc output_csv'


def main(name_distances_loc, addr_distances_loc, answers_loc, output_csv):
    raw_name_distance_info = load_csv(name_distances_loc)
    raw_addr_distance_info = load_csv(addr_distances_loc)
    raw_answers_info = load_csv(answers_loc)

    distance_info = SimilarityInformation(
        raw_name_distance_info,
        raw_addr_distance_info
    )

    answer_info = AnswerInformation(raw_answers_info)

    combined_values = []
    for name in distance_info.get_reference_names():
        name_similarity = distance_info.get_name_similarity(name)
        addr_similarity = distance_info.get_addr_similarity(name)
        cluster = answer_info.get_cluster_by_name(name)
        combined_values.append({
            'name_similarity': name_similarity,
            'addr_similarity': addr_similarity,
            'cluster': cluster
        })

    with open(output_csv, 'w') as f:
        target_csv = csv.DictReader(
            f,
            ['name_similarity', 'addr_similarity', 'cluster']
        )
        target_csv.writeheader()
        target_csv.writerows(combined_values)


if __name__ == '__main__':
    if len(sys.argv) < 5:
        print USAGE_STR
    else:
        main(
            sys.argv[1],
            sys.argv[2],
            sys.argv[3],
            sys.argv[4]
        )
